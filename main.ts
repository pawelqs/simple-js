import { Plugin, Notice } from 'obsidian';
import { SimpleJSSettings, DEFAULT_SETTINGS, SimpleJSSettingTab } from './src/simple-settings';
import { DataReader } from './src/DataReader';
import { PlotlyManager } from './src/PlotlyManager';
import { UIRenderer, ControlBarOptions } from './src/UIRenderer';
import { CodeExecutor } from './src/CodeExecutor';
import { ExecutionContextProvider } from './src/ExecutionContextProvider';

export default class SimpleJSPlugin extends Plugin {
    settings: SimpleJSSettings;
    
    // Components
    private dataReader: DataReader;
    private plotlyManager: PlotlyManager;
    private uiRenderer: UIRenderer;
    private codeExecutor: CodeExecutor;
    private contextProvider: ExecutionContextProvider;

    async onload() {
        console.log('SimpleJS: Plugin loading...');
        
        await this.loadSettings();
        this.initializeComponents();
        this.registerCodeBlockProcessor();
        this.addSettingsAndCommands();
        
        console.log('SimpleJS: Plugin loaded successfully');
    }

    private initializeComponents() {
        this.dataReader = new DataReader(this.app);
        this.plotlyManager = new PlotlyManager(this.settings);
        this.uiRenderer = new UIRenderer();
        this.codeExecutor = new CodeExecutor(this.settings);
        this.contextProvider = new ExecutionContextProvider(
            this.dataReader,
            this.plotlyManager,
            this.uiRenderer,
            this.settings
        );
    }

    private registerCodeBlockProcessor() {
        this.registerMarkdownCodeBlockProcessor('simplejs', async (source, el, ctx) => {
            console.log('SimpleJS: Processing block:', source.substring(0, 50) + '...');
            
            try {
                await this.processSimpleJSBlock(source, el, ctx);
            } catch (error: any) {
                console.error('SimpleJS: Block processing error:', error);
                this.uiRenderer.showError(el, error.message);
            }
        });
    }

    private addSettingsAndCommands() {
        // Add settings tab
        this.addSettingTab(new SimpleJSSettingTab(this.app, this));
        
        // Add commands
        this.addCommand({
            id: 'clear-plotly-cache',
            name: 'Clear Plotly cache and reload',
            callback: () => {
                this.plotlyManager.clearCache();
                new Notice('Plotly cache cleared');
            }
        });

        this.addCommand({
            id: 'validate-syntax',
            name: 'Validate SimpleJS syntax in current selection',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                if (selection) {
                    const validation = this.codeExecutor.validateCode(selection);
                    if (validation.isValid) {
                        new Notice('✅ Code validation passed');
                    } else {
                        new Notice(`❌ Validation issues: ${validation.issues.join(', ')}`);
                    }
                } else {
                    new Notice('Please select code to validate');
                }
            }
        });
    }

    private async processSimpleJSBlock(source: string, el: HTMLElement, ctx: any) {
        // Create UI container
        const outputContainer = this.uiRenderer.createOutputContainer(el);
        
        // Show loading
        const loading = this.uiRenderer.showLoading(outputContainer.content);

        let showSuccess = false;
        
        try {
            // Optional: Validate code before execution
            const validation = this.codeExecutor.validateCode(source);
            if (!validation.isValid) {
                console.warn('Code validation issues:', validation.issues);
            }

            // Create execution context
            const context = this.contextProvider.createContext(
                outputContainer.content, 
                ctx.sourcePath
            );
            
            // Execute code
            await this.codeExecutor.execute(source, context);
            
            // Remove loading indicator
            loading.remove();
            
            // Determine if success message should be shown (no output generated)
            showSuccess = outputContainer.content.children.length === 0;
            
        } catch (error: any) {
            loading.remove();
            this.uiRenderer.showError(outputContainer.content, error.message);
            showSuccess = false; // Don't show success when there's an error
        }
        
        // Add control bar with success status
        const controlBarOptions: ControlBarOptions = {
            showSuccess: showSuccess
        };
        
        this.uiRenderer.addControlBar(outputContainer.container, () => {
            this.processSimpleJSBlock(source, el, ctx);
        }, controlBarOptions);
    }

    async updateSettings(newSettings: Partial<SimpleJSSettings>) {
        this.settings = { ...this.settings, ...newSettings };
        await this.saveSettings();
        
        // Reinitialize components that depend on settings
        this.plotlyManager = new PlotlyManager(this.settings);
        this.codeExecutor = new CodeExecutor(this.settings);
        this.contextProvider = new ExecutionContextProvider(
            this.dataReader,
            this.plotlyManager,
            this.uiRenderer,
            this.settings
        );
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log('SimpleJS: Plugin unloaded');
        this.plotlyManager?.clearCache();
    }
}