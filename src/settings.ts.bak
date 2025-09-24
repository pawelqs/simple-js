import { App, PluginSettingTab, Setting } from 'obsidian';
import SimpleJSPlugin from '../main';

export interface SimpleJSPluginSettings {
    // Plotly settings
    loadStrategy: 'bundle' | 'dynamic';
    defaultTheme: 'light' | 'dark' | 'auto';
    
    // Data settings
    tsvDelimiter: string;
    decimalSeparator: '.' | ',';
    maxRows: number;
    cacheFiles: boolean;
    
    // Execution settings
    timeoutMs: number;
    allowConsole: boolean;
    
    // Security settings
    allowNetwork: boolean;
    
    // Auto-run settings
    autoRunOnFileChange: boolean;
}

export const DEFAULT_SETTINGS: SimpleJSPluginSettings = {
    // Plotly
    loadStrategy: 'dynamic',
    defaultTheme: 'auto',
    
    // Data
    tsvDelimiter: '\t',
    decimalSeparator: '.',
    maxRows: 100000,
    cacheFiles: true,
    
    // Execution
    timeoutMs: 2000,
    allowConsole: true,
    
    // Security
    allowNetwork: false, // locked in v1
    
    // Auto-run
    autoRunOnFileChange: true,
};

export class SimpleJSSettingTab extends PluginSettingTab {
    plugin: SimpleJSPlugin;

    constructor(app: App, plugin: SimpleJSPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'SimpleJS Plots Settings' });

        // Plotly Settings
        containerEl.createEl('h3', { text: 'Plotly Settings' });

        new Setting(containerEl)
            .setName('Load strategy')
            .setDesc('How to load Plotly: bundle with plugin or load dynamically when needed')
            .addDropdown(dropdown => dropdown
                .addOption('dynamic', 'Dynamic (load when needed)')
                .addOption('bundle', 'Bundle (include with plugin)')
                .setValue(this.plugin.settings.loadStrategy)
                .onChange(async (value: 'bundle' | 'dynamic') => {
                    this.plugin.settings.loadStrategy = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default theme')
            .setDesc('Default theme for plots')
            .addDropdown(dropdown => dropdown
                .addOption('auto', 'Auto (match Obsidian theme)')
                .addOption('light', 'Light')
                .addOption('dark', 'Dark')
                .setValue(this.plugin.settings.defaultTheme)
                .onChange(async (value: 'light' | 'dark' | 'auto') => {
                    this.plugin.settings.defaultTheme = value;
                    await this.plugin.saveSettings();
                }));

        // Data Settings
        containerEl.createEl('h3', { text: 'Data Settings' });

        new Setting(containerEl)
            .setName('TSV delimiter')
            .setDesc('Default delimiter for TSV files (tab character: \\t)')
            .addText(text => text
                .setPlaceholder('\\t')
                .setValue(this.plugin.settings.tsvDelimiter === '\t' ? '\\t' : this.plugin.settings.tsvDelimiter)
                .onChange(async (value) => {
                    // Handle escaped tab character
                    const delimiter = value === '\\t' ? '\t' : value;
                    this.plugin.settings.tsvDelimiter = delimiter;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Decimal separator')
            .setDesc('Decimal separator for numeric parsing')
            .addDropdown(dropdown => dropdown
                .addOption('.', 'Period (.)')
                .addOption(',', 'Comma (,)')
                .setValue(this.plugin.settings.decimalSeparator)
                .onChange(async (value: '.' | ',') => {
                    this.plugin.settings.decimalSeparator = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Maximum rows')
            .setDesc('Maximum number of rows to read from data files (safety limit)')
            .addText(text => text
                .setPlaceholder('100000')
                .setValue(this.plugin.settings.maxRows.toString())
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.maxRows = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Cache files')
            .setDesc('Cache file contents while note is open for better performance')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cacheFiles)
                .onChange(async (value) => {
                    this.plugin.settings.cacheFiles = value;
                    await this.plugin.saveSettings();
                }));

        // Execution Settings
        containerEl.createEl('h3', { text: 'Execution Settings' });

        new Setting(containerEl)
            .setName('Timeout (ms)')
            .setDesc('Maximum execution time for SimpleJS blocks (milliseconds)')
            .addText(text => text
                .setPlaceholder('2000')
                .setValue(this.plugin.settings.timeoutMs.toString())
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.timeoutMs = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Allow console output')
            .setDesc('Allow console.log statements in SimpleJS blocks (output to developer console)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.allowConsole)
                .onChange(async (value) => {
                    this.plugin.settings.allowConsole = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-run on file change')
            .setDesc('Automatically re-run SimpleJS blocks when referenced data files change')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoRunOnFileChange)
                .onChange(async (value) => {
                    this.plugin.settings.autoRunOnFileChange = value;
                    await this.plugin.saveSettings();
                }));

        // Security note
        containerEl.createEl('h3', { text: 'Security' });
        containerEl.createEl('p', { 
            text: 'Network access is disabled for security and privacy. All processing happens locally within your vault.',
            cls: 'setting-item-description'
        });
    }
}