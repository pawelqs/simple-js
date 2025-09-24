import { Plugin, Notice } from 'obsidian';
import { SimpleJSPluginSettings, DEFAULT_SETTINGS, SimpleJSSettingTab } from './src/settings';
import { BlockExecutor } from './src/executor';

export default class SimpleJSPlugin extends Plugin {
    settings: SimpleJSPluginSettings;
    blockExecutor: BlockExecutor;

    async onload() {
        console.log('Loading SimpleJS Plugin...');

        // Load settings
        await this.loadSettings();

        // Initialize block executor
        this.blockExecutor = new BlockExecutor(
            this.app,
            this.app.vault,
            this.app.metadataCache,
            this.settings
        );

        // Register markdown code block processor for 'simplejs'
        this.registerMarkdownCodeBlockProcessor(
            'simplejs',
            async (source, el, ctx) => {
                console.log('[SimpleJS] Processing block:', source.substring(0, 50) + '...');
                try {
                    await this.blockExecutor.processCodeBlock(source, el, ctx);
                } catch (error: any) {
                    console.error('[SimpleJS] Block processing error:', error);
                    
                    // Clear element and show error
                    el.empty();
                    const errorDiv = el.createDiv('simplejs-error');
                    errorDiv.createEl('strong', { text: 'SimpleJS Error: ' });
                    errorDiv.createSpan({ text: error.message || 'Unknown error occurred' });
                    
                    // Add debugging info
                    const debugDiv = errorDiv.createDiv('simplejs-error-hint');
                    debugDiv.setText(`💡 Check the browser console (F12) for more details. Plugin version: 1.0.0`);
                }
            }
        );

        // Add settings tab
        this.addSettingTab(new SimpleJSSettingTab(this.app, this));

        // Register commands
        this.addCommands();

        console.log('SimpleJS Plugin loaded successfully');
    }

    private addCommands() {
        // Re-run blocks in current file
        this.addCommand({
            id: 'rerun-blocks-current-file',
            name: 'Re-run blocks in current file',
            callback: async () => {
                try {
                    await this.blockExecutor.rerunCurrentFile();
                    new Notice('SimpleJS blocks re-executed');
                } catch (error) {
                    new Notice(`Failed to re-run blocks: ${error.message}`);
                    console.error('Failed to re-run blocks:', error);
                }
            }
        });

        // Toggle auto-run on file change
        this.addCommand({
            id: 'toggle-auto-run',
            name: 'Toggle auto-run on file change',
            callback: async () => {
                this.settings.autoRunOnFileChange = !this.settings.autoRunOnFileChange;
                await this.saveSettings();
                new Notice(`Auto-run ${this.settings.autoRunOnFileChange ? 'enabled' : 'disabled'}`);
            }
        });

        // Clear data cache
        this.addCommand({
            id: 'clear-data-cache',
            name: 'Clear data cache',
            callback: () => {
                this.blockExecutor.clearFileCache();
                new Notice('Data cache cleared');
            }
        });
    }

    onunload() {
        console.log('Unloading SimpleJS Plugin...');
        
        // Clean up resources
        if (this.blockExecutor) {
            this.blockExecutor.dispose();
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update block executor settings
        if (this.blockExecutor) {
            // For now, we'll need to recreate the executor with new settings
            // In a more sophisticated implementation, we might make settings reactive
            this.blockExecutor.dispose();
            this.blockExecutor = new BlockExecutor(
                this.app,
                this.app.vault,
                this.app.metadataCache,
                this.settings
            );
        }
    }
}
