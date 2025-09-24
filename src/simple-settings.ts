import { App, PluginSettingTab, Setting } from 'obsidian';

export interface SimpleJSSettings {
    allowConsole: boolean;
    timeoutMs: number;
    autoLoadPlotly: boolean;
    plotlyTheme: 'auto' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: SimpleJSSettings = {
    allowConsole: true,
    timeoutMs: 5000,
    autoLoadPlotly: true,
    plotlyTheme: 'auto'
};

export class SimpleJSSettingTab extends PluginSettingTab {
    plugin: any;

    constructor(app: App, plugin: any) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'SimpleJS Settings' });

        new Setting(containerEl)
            .setName('Allow console output')
            .setDesc('Allow console.log statements in SimpleJS blocks')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.allowConsole)
                .onChange(async (value) => {
                    this.plugin.settings.allowConsole = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Execution timeout (ms)')
            .setDesc('Maximum execution time for SimpleJS blocks')
            .addText(text => text
                .setPlaceholder('5000')
                .setValue(this.plugin.settings.timeoutMs.toString())
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.timeoutMs = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Auto-load Plotly')
            .setDesc('Automatically load Plotly when needed')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoLoadPlotly)
                .onChange(async (value) => {
                    this.plugin.settings.autoLoadPlotly = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Plot theme')
            .setDesc('Theme for Plotly charts')
            .addDropdown(dropdown => dropdown
                .addOption('auto', 'Auto (match Obsidian theme)')
                .addOption('light', 'Light')
                .addOption('dark', 'Dark')
                .setValue(this.plugin.settings.plotlyTheme)
                .onChange(async (value: 'auto' | 'light' | 'dark') => {
                    this.plugin.settings.plotlyTheme = value;
                    await this.plugin.saveSettings();
                }));
    }
}