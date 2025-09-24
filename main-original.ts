import { Plugin, Notice } from 'obsidian';
import { SimpleJSSettings, DEFAULT_SETTINGS, SimpleJSSettingTab } from './src/simple-settings';

export default class SimpleJSPlugin extends Plugin {
    settings: SimpleJSSettings;
    plotlyLoaded = false;

    async onload() {
        console.log('SimpleJS: Plugin loading...');
        
        await this.loadSettings();
        
        this.registerMarkdownCodeBlockProcessor('simplejs', async (source, el, ctx) => {
            console.log('SimpleJS: Processing block:', source.substring(0, 50) + '...');
            
            try {
                await this.processSimpleJSBlock(source, el, ctx);
            } catch (error: any) {
                console.error('SimpleJS: Block processing error:', error);
                this.showError(el, error.message);
            }
        });
        
        // Add settings tab
        this.addSettingTab(new SimpleJSSettingTab(this.app, this));
        
        // Add commands
        this.addCommand({
            id: 'clear-plotly-cache',
            name: 'Clear Plotly cache and reload',
            callback: () => {
                this.plotlyLoaded = false;
                delete (window as any).Plotly;
                new Notice('Plotly cache cleared');
            }
        });
        
        console.log('SimpleJS: Plugin loaded successfully');
    }

    async processSimpleJSBlock(source: string, el: HTMLElement, ctx: any) {
        // Setup container with styling
        el.empty();
        const container = el.createDiv('simplejs-container');
        container.style.border = '1px solid var(--background-modifier-border)';
        container.style.borderRadius = '6px';
        container.style.overflow = 'hidden';
        
        // Add header
        const header = container.createDiv('simplejs-header');
        header.style.background = 'var(--background-secondary)';
        header.style.padding = '8px 12px';
        header.style.fontWeight = 'bold';
        header.textContent = 'SimpleJS Output';
        
        // Add content area
        const content = container.createDiv('simplejs-content');
        content.style.padding = '12px';
        
        // Show loading
        const loading = content.createDiv();
        loading.textContent = 'Executing...';
        loading.style.color = 'var(--text-muted)';

        try {
            // Create execution context
            const context = this.createExecutionContext(content, ctx);
            
            // Execute with timeout
            await Promise.race([
                this.executeCode(source, context),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Execution timeout')), this.settings.timeoutMs)
                )
            ]);
            
            loading.remove();
            
            // If no output was generated
            if (content.children.length === 0) {
                content.createDiv({
                    text: '✅ Code executed successfully',
                    cls: 'simplejs-success'
                });
            }
            
        } catch (error: any) {
            loading.remove();
            this.showError(content, error.message);
        }
        
        // Add controls
        this.addControlBar(container, source, el, ctx);
    }

    createExecutionContext(outputContainer: HTMLElement, ctx: any) {
        return {
            readYaml: async (path: string) => {
                const resolvedPath = this.resolvePath(path, ctx.sourcePath);
                const file = this.app.vault.getAbstractFileByPath(resolvedPath);
                
                if (!file || !('stat' in file)) {
                    throw new Error(`YAML file not found: ${resolvedPath}`);
                }
                
                const content = await this.app.vault.read(file as any);
                return this.parseSimpleYaml(content);
            },
            
            readTsv: async (path: string, options: any = {}) => {
                const resolvedPath = this.resolvePath(path, ctx.sourcePath);
                const file = this.app.vault.getAbstractFileByPath(resolvedPath);
                
                if (!file || !('stat' in file)) {
                    throw new Error(`TSV file not found: ${resolvedPath}`);
                }
                
                const content = await this.app.vault.read(file as any);
                return this.parseTsv(content, options);
            },
            
            plot: async (spec: any) => {
                await this.ensurePlotlyLoaded();
                
                const plotContainer = outputContainer.createDiv('simplejs-plot');
                plotContainer.style.minHeight = '400px';
                plotContainer.style.margin = '8px 0';
                
                const Plotly = (window as any).Plotly;
                const layout = this.applyPlotlyTheme(spec.layout || {});
                
                await Plotly.newPlot(plotContainer, spec.data, layout, {
                    responsive: true,
                    displaylogo: false,
                    ...spec.config
                });
            },
            
            table: (rows: any[], options: any = {}) => {
                if (!Array.isArray(rows) || rows.length === 0) {
                    outputContainer.createDiv({
                        text: 'No data to display',
                        cls: 'simplejs-empty'
                    });
                    return;
                }
                
                this.createTable(outputContainer, rows, options);
            },
            
            console: {
                log: (...args: any[]) => {
                    if (this.settings.allowConsole) {
                        const message = args.map(arg => 
                            typeof arg === 'string' ? arg : JSON.stringify(arg)
                        ).join(' ');
                        console.log('[SimpleJS]', ...args);
                        this.addConsoleOutput(outputContainer, 'log', message);
                    }
                },
                warn: (...args: any[]) => {
                    if (this.settings.allowConsole) {
                        const message = args.map(arg => 
                            typeof arg === 'string' ? arg : JSON.stringify(arg)
                        ).join(' ');
                        console.warn('[SimpleJS]', ...args);
                        this.addConsoleOutput(outputContainer, 'warn', message);
                    }
                },
                error: (...args: any[]) => {
                    if (this.settings.allowConsole) {
                        const message = args.map(arg => 
                            typeof arg === 'string' ? arg : JSON.stringify(arg)
                        ).join(' ');
                        console.error('[SimpleJS]', ...args);
                        this.addConsoleOutput(outputContainer, 'error', message);
                    }
                }
            }
        };
    }

    private createTable(container: HTMLElement, rows: any[], options: any = {}) {
        const table = container.createEl('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.margin = '8px 0';
        table.style.fontSize = '0.9em';
        
        const columns = options.columns || Object.keys(rows[0]);
        
        // Header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        columns.forEach((col: string) => {
            const th = headerRow.createEl('th');
            th.textContent = col;
            th.style.padding = '8px 12px';
            th.style.background = 'var(--background-secondary)';
            th.style.border = '1px solid var(--background-modifier-border)';
            th.style.textAlign = 'left';
        });
        
        // Body
        const tbody = table.createEl('tbody');
        const displayRows = rows.slice(0, options.pageSize || 50);
        
        displayRows.forEach(row => {
            const tr = tbody.createEl('tr');
            columns.forEach((col: string) => {
                const td = tr.createEl('td');
                const value = row[col];
                td.textContent = value === null || value === undefined ? '' : String(value);
                td.style.padding = '6px 12px';
                td.style.border = '1px solid var(--background-modifier-border)';
            });
        });
        
        if (rows.length > displayRows.length) {
            const info = container.createDiv();
            info.textContent = `Showing ${displayRows.length} of ${rows.length} rows`;
            info.style.fontSize = '0.8em';
            info.style.color = 'var(--text-muted)';
        }
    }

    private addConsoleOutput(container: HTMLElement, type: string, message: string) {
        const consoleDiv = container.createDiv('simplejs-console-line');
        consoleDiv.style.padding = '4px 8px';
        consoleDiv.style.margin = '2px 0';
        consoleDiv.style.fontFamily = 'var(--font-monospace)';
        consoleDiv.style.fontSize = '0.85em';
        consoleDiv.style.background = 'var(--background-secondary)';
        consoleDiv.style.borderRadius = '3px';
        
        const prefix = consoleDiv.createSpan();
        prefix.textContent = `[${type.toUpperCase()}] `;
        prefix.style.fontWeight = 'bold';
        prefix.style.color = type === 'error' ? 'var(--text-error)' : 
                            type === 'warn' ? '#ff8c00' : 'var(--text-muted)';
        
        consoleDiv.createSpan({ text: message });
    }

    private addControlBar(container: HTMLElement, source: string, el: HTMLElement, ctx: any) {
        const controls = container.createDiv('simplejs-controls');
        controls.style.background = 'var(--background-secondary)';
        controls.style.padding = '8px';
        controls.style.borderTop = '1px solid var(--background-modifier-border)';
        controls.style.display = 'flex';
        controls.style.justifyContent = 'flex-end';
        controls.style.gap = '8px';
        
        const rerunBtn = controls.createEl('button', { text: '↻ Re-run' });
        rerunBtn.style.padding = '4px 8px';
        rerunBtn.style.fontSize = '0.8em';
        rerunBtn.onclick = () => this.processSimpleJSBlock(source, el, ctx);
    }

    private async executeCode(code: string, context: any) {
        const safeEval = new Function(
            'readYaml', 'readTsv', 'plot', 'table', 'console',
            `
            "use strict";
            return (async function() {
                ${code}
            })();
            `
        );

        await safeEval(
            context.readYaml,
            context.readTsv,
            context.plot,
            context.table,
            context.console
        );
    }

    private resolvePath(path: string, currentFile?: string): string {
        if (path.startsWith('/')) return path.substring(1);
        if (currentFile) {
            const currentDir = currentFile.split('/').slice(0, -1).join('/');
            return currentDir ? `${currentDir}/${path}` : path;
        }
        return path;
    }

    private parseSimpleYaml(content: string): any {
        const lines = content.trim().split('\n');
        const result: any = {};
        let currentKey = '';
        let currentArray: any[] = [];
        
        for (const line of lines) {
            if (line.includes(':') && !line.trim().startsWith('-')) {
                if (currentKey && currentArray.length > 0) {
                    result[currentKey] = currentArray;
                }
                currentKey = line.split(':')[0].trim();
                currentArray = [];
            } else if (line.trim().startsWith('-')) {
                const item = line.trim().substring(1).trim();
                if (item.includes(':')) {
                    const [date, value] = item.split(':').map(s => s.trim());
                    const obj: any = {};
                    obj[date] = isNaN(Number(value)) ? value : Number(value);
                    currentArray.push(obj);
                }
            }
        }
        
        if (currentKey && currentArray.length > 0) {
            result[currentKey] = currentArray;
        }
        
        return result;
    }

    private parseTsv(content: string, options: any = {}): any[] {
        const delimiter = options.delimiter || '\t';
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        if (lines.length === 0) return [];
        
        const headers = lines[0].split(delimiter).map(h => h.trim());
        const rows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(delimiter);
            const row: any = {};
            
            headers.forEach((header, index) => {
                const value = values[index]?.trim() || '';
                if (value === '') {
                    row[header] = null;
                } else {
                    const num = Number(value);
                    row[header] = isNaN(num) ? value : num;
                }
            });
            
            rows.push(row);
        }
        
        return rows;
    }

    private async ensurePlotlyLoaded(): Promise<void> {
        if (this.plotlyLoaded && (window as any).Plotly) return;
        
        if (!this.settings.autoLoadPlotly) {
            throw new Error('Plotly loading is disabled in settings');
        }

        if (!(window as any).Plotly) {
            await this.loadPlotlyFromCDN();
        }
        this.plotlyLoaded = true;
    }

    private loadPlotlyFromCDN(): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.plot.ly/plotly-2.26.0.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Plotly from CDN'));
            document.head.appendChild(script);
        });
    }

    private applyPlotlyTheme(layout: any): any {
        const theme = this.getEffectiveTheme();
        
        if (theme === 'dark') {
            return {
                paper_bgcolor: '#1e1e1e',
                plot_bgcolor: '#1e1e1e',
                font: { color: '#ffffff' },
                ...layout
            };
        }
        
        return {
            paper_bgcolor: '#ffffff',
            plot_bgcolor: '#ffffff',
            font: { color: '#000000' },
            ...layout
        };
    }

    private getEffectiveTheme(): 'light' | 'dark' {
        if (this.settings.plotlyTheme === 'auto') {
            return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
        }
        return this.settings.plotlyTheme;
    }

    private showError(container: HTMLElement, message: string) {
        container.empty();
        const errorDiv = container.createDiv('simplejs-error');
        errorDiv.style.padding = '12px';
        errorDiv.style.background = 'var(--background-modifier-error)';
        errorDiv.style.border = '1px solid var(--text-error)';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.color = 'var(--text-error)';
        
        const title = errorDiv.createEl('strong');
        title.textContent = 'SimpleJS Error: ';
        errorDiv.createSpan({ text: message });
        
        console.error('[SimpleJS] Error:', message);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log('SimpleJS: Plugin unloaded');
    }
}