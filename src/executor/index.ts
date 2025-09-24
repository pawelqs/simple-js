import { TFile, Vault, MetadataCache, MarkdownPostProcessorContext, MarkdownView, App } from 'obsidian';
import { SandboxExecutor, SandboxExecutionResult } from '../runtime/sandbox';
import { SimpleJSPluginSettings } from '../settings';

export interface CachedFile {
    content: string;
    mtime: number;
}

export interface ExecutionContext {
    file: TFile;
    source: string;
    element: HTMLElement;
    context: MarkdownPostProcessorContext;
}

export class BlockExecutor {
    private fileCache = new Map<string, CachedFile>();
    private watchedFiles = new Set<string>();
    private executionContexts = new Map<HTMLElement, ExecutionContext>();
    private sandboxExecutor: SandboxExecutor;

    constructor(
        private app: App,
        private vault: Vault,
        private metadataCache: MetadataCache,
        private settings: SimpleJSPluginSettings
    ) {
        this.sandboxExecutor = new SandboxExecutor(vault, settings);
        this.setupFileWatcher();
    }

    async processCodeBlock(
        source: string, 
        el: HTMLElement, 
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        // Get the current file
        const file = this.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!file || !(file instanceof TFile)) {
            this.showError(el, 'Could not determine source file');
            return;
        }

        // Store execution context for re-runs
        const executionContext: ExecutionContext = { file, source, element: el, context: ctx };
        this.executionContexts.set(el, executionContext);

        // Execute the block
        await this.executeBlock(executionContext);
    }

    async executeBlock(context: ExecutionContext): Promise<void> {
        const { source, element, file } = context;

        // Create output container
        element.empty();
        const container = element.createDiv('simplejs-output');
        
        // Add loading indicator
        const loading = container.createDiv('simplejs-loading');
        loading.setText('Executing...');

        try {
            // Execute in sandbox
            const result = await this.sandboxExecutor.execute(
                source,
                container,
                file.path
            );

            // Remove loading indicator
            loading.remove();

            if (result.success) {
                // Show success
                if (result.plots?.length === 0 && result.tables?.length === 0 && result.logs?.length === 0) {
                    const info = container.createDiv('simplejs-info');
                    info.setText('Code executed successfully (no output)');
                }
                
                // Show console logs if any
                if (result.logs && result.logs.length > 0 && this.settings.allowConsole) {
                    const logContainer = container.createDiv('simplejs-logs');
                    const logHeader = logContainer.createEl('details');
                    const summary = logHeader.createEl('summary', { text: `Console output (${result.logs.length})` });
                    const logContent = logHeader.createDiv('simplejs-log-content');
                    
                    result.logs.forEach(log => {
                        const logLine = logContent.createDiv('simplejs-log-line');
                        logLine.setText(log);
                    });
                }
            } else {
                // Show error
                this.showError(container, result.error || 'Unknown error');
            }

        } catch (error: any) {
            loading.remove();
            this.showError(container, error.message || 'Execution failed');
        }

        // Add re-run button
        this.addControlBar(container, context);
    }

    private showError(container: HTMLElement, message: string): void {
        const errorDiv = container.createDiv('simplejs-error');
        errorDiv.createEl('strong', { text: 'SimpleJS Error: ' });
        errorDiv.createSpan({ text: message });
        
        // Add some basic troubleshooting hints
        if (message.includes('file not found')) {
            const hint = errorDiv.createDiv('simplejs-error-hint');
            hint.setText('💡 Check that the file path is correct and the file exists in your vault.');
        } else if (message.includes('timeout')) {
            const hint = errorDiv.createDiv('simplejs-error-hint');
            hint.setText('💡 Code execution timed out. Try simplifying your code or increase the timeout in settings.');
        } else if (message.includes('YAML') || message.includes('TSV')) {
            const hint = errorDiv.createDiv('simplejs-error-hint');
            hint.setText('💡 Check the file format and syntax. See the plugin documentation for examples.');
        }
    }

    private addControlBar(container: HTMLElement, context: ExecutionContext): void {
        const controlBar = container.createDiv('simplejs-control-bar');
        
        // Re-run button
        const rerunBtn = controlBar.createEl('button', {
            text: '↻ Re-run',
            cls: 'simplejs-control-btn'
        });
        
        rerunBtn.onclick = async () => {
            await this.executeBlock(context);
        };

        // Clear cache button
        const clearCacheBtn = controlBar.createEl('button', {
            text: '🗑 Clear Cache',
            cls: 'simplejs-control-btn'
        });
        
        clearCacheBtn.onclick = () => {
            this.clearFileCache();
            // Re-run after clearing cache
            this.executeBlock(context);
        };
    }

    async rerunAllBlocksInFile(file: TFile): Promise<void> {
        const contexts: ExecutionContext[] = [];
        
        // Find all execution contexts for this file
        for (const [element, context] of this.executionContexts.entries()) {
            if (context.file.path === file.path) {
                contexts.push(context);
            }
        }

        // Re-run all blocks
        for (const context of contexts) {
            await this.executeBlock(context);
        }
    }

    private setupFileWatcher(): void {
        if (!this.settings.autoRunOnFileChange) {
            return;
        }

        this.vault.on('modify', (file) => {
            if (file instanceof TFile) {
                this.onFileModified(file);
            }
        });

        this.vault.on('delete', (file) => {
            if (file instanceof TFile) {
                this.onFileDeleted(file);
            }
        });
    }

    private async onFileModified(file: TFile): Promise<void> {
        const path = file.path;
        
        // Remove from cache
        this.fileCache.delete(path);
        
        // Check if this file is referenced by any SimpleJS blocks
        const isReferenced = this.watchedFiles.has(path);
        
        if (isReferenced) {
            // Find and re-run blocks that might reference this file
            // This is a simple approach - we re-run all blocks in files that might reference changed data
            await this.rerunBlocksReferencingFile(path);
        }
    }

    private onFileDeleted(file: TFile): void {
        const path = file.path;
        this.fileCache.delete(path);
        this.watchedFiles.delete(path);
    }

    private async rerunBlocksReferencingFile(changedFilePath: string): Promise<void> {
        // This is a simplified approach - in practice, you'd want to track which blocks
        // reference which files more precisely
        const allContexts = Array.from(this.executionContexts.values());
        
        for (const context of allContexts) {
            // Simple heuristic: if the source code contains the filename, re-run
            const filename = changedFilePath.split('/').pop();
            if (filename && context.source.includes(filename)) {
                await this.executeBlock(context);
            }
        }
    }

    registerFileAccess(filePath: string): void {
        this.watchedFiles.add(filePath);
    }

    clearFileCache(): void {
        this.fileCache.clear();
    }

    getCacheInfo(): { size: number; files: string[] } {
        return {
            size: this.fileCache.size,
            files: Array.from(this.fileCache.keys())
        };
    }

    // Clean up execution context when element is removed
    cleanupElement(element: HTMLElement): void {
        this.executionContexts.delete(element);
    }

    // Re-run all blocks in current file
    async rerunCurrentFile(): Promise<void> {
        // Get active file
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || !activeView.file) {
            return;
        }

        await this.rerunAllBlocksInFile(activeView.file);
    }

    dispose(): void {
        this.fileCache.clear();
        this.watchedFiles.clear();
        this.executionContexts.clear();
        this.sandboxExecutor.dispose();
    }
}