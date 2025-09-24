import { YamlLoader } from '../io/yaml';
import { TsvLoader, TsvOptions } from '../io/tsv';
import { PlotlyRenderer, PlotSpec } from '../plot/plotly';
import { SimpleJSPluginSettings } from '../settings';
import { Vault } from 'obsidian';

export interface SandboxContext {
    readYaml: (path: string) => Promise<any>;
    readTsv: (path: string, opts?: TsvOptions) => Promise<Array<Record<string, any>>>;
    plot: (spec: PlotSpec) => void;
    table: (rows: Array<Record<string, any>>, opts?: TableOptions) => void;
    console: {
        log: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
}

export interface TableOptions {
    columns?: string[];
    pageSize?: number;
}

export interface SandboxExecutionResult {
    success: boolean;
    error?: string;
    plots?: HTMLElement[];
    tables?: HTMLElement[];
    logs?: string[];
}

export class SandboxExecutor {
    private yamlLoader: YamlLoader;
    private tsvLoader: TsvLoader;
    private plotlyRenderer: PlotlyRenderer;
    private logs: string[] = [];

    constructor(
        private vault: Vault,
        private settings: SimpleJSPluginSettings
    ) {
        this.yamlLoader = new YamlLoader(vault);
        this.tsvLoader = new TsvLoader(vault);
        this.plotlyRenderer = new PlotlyRenderer(settings);
    }

    async execute(
        code: string,
        outputContainer: HTMLElement,
        currentFilePath?: string
    ): Promise<SandboxExecutionResult> {
        this.logs = [];
        const plots: HTMLElement[] = [];
        const tables: HTMLElement[] = [];

        try {
            // Clear previous output
            outputContainer.empty();

            // Create sandbox context
            const context = this.createContext(outputContainer, plots, tables, currentFilePath);

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Execution timeout')), this.settings.timeoutMs);
            });

            // Create execution promise
            const executionPromise = this.executeInSandbox(code, context);

            // Race the execution against timeout
            await Promise.race([executionPromise, timeoutPromise]);

            return {
                success: true,
                plots,
                tables,
                logs: this.logs
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Unknown execution error',
                plots,
                tables,
                logs: this.logs
            };
        }
    }

    private createContext(
        outputContainer: HTMLElement,
        plots: HTMLElement[],
        tables: HTMLElement[],
        currentFilePath?: string
    ): SandboxContext {
        return {
            readYaml: async (path: string) => {
                const resolvedPath = this.resolvePath(path, currentFilePath);
                return await this.yamlLoader.loadYaml(resolvedPath);
            },

            readTsv: async (path: string, opts?: TsvOptions) => {
                const resolvedPath = this.resolvePath(path, currentFilePath);
                const finalOpts = {
                    delimiter: this.settings.tsvDelimiter,
                    decimal: this.settings.decimalSeparator,
                    maxRows: this.settings.maxRows,
                    ...opts
                };
                return await this.tsvLoader.loadTsv(resolvedPath, finalOpts);
            },

            plot: (spec: PlotSpec) => {
                // Validate the plot spec
                const errors = this.plotlyRenderer.validatePlotSpec(spec);
                if (errors.length > 0) {
                    throw new Error(`Plot validation failed: ${errors.join(', ')}`);
                }

                // Create plot container
                const plotContainer = outputContainer.createDiv('simplejs-plot-container');
                const plotElement = plotContainer.createDiv('simplejs-plot');

                // Render the plot
                this.plotlyRenderer.createPlot(plotElement, spec).catch(error => {
                    plotElement.setText(`Plot error: ${error.message}`);
                    plotElement.addClass('simplejs-error');
                });

                // Create toolbar
                this.plotlyRenderer.createPlotToolbar(plotContainer, plotElement);

                plots.push(plotElement);
            },

            table: (rows: Array<Record<string, any>>, opts: TableOptions = {}) => {
                const tableContainer = outputContainer.createDiv('simplejs-table-container');
                const tableElement = this.createTable(tableContainer, rows, opts);
                tables.push(tableElement);
            },

            console: {
                log: (...args: any[]) => {
                    if (this.settings.allowConsole) {
                        const message = args.map(arg => this.serializeForLog(arg)).join(' ');
                        this.logs.push(`[LOG] ${message}`);
                        console.log('[SimpleJS]', ...args);
                    }
                },
                warn: (...args: any[]) => {
                    if (this.settings.allowConsole) {
                        const message = args.map(arg => this.serializeForLog(arg)).join(' ');
                        this.logs.push(`[WARN] ${message}`);
                        console.warn('[SimpleJS]', ...args);
                    }
                },
                error: (...args: any[]) => {
                    if (this.settings.allowConsole) {
                        const message = args.map(arg => this.serializeForLog(arg)).join(' ');
                        this.logs.push(`[ERROR] ${message}`);
                        console.error('[SimpleJS]', ...args);
                    }
                }
            }
        };
    }

    private async executeInSandbox(code: string, context: SandboxContext): Promise<void> {
        try {
            // Create a safer execution environment
            const safeEval = new Function(
                'readYaml',
                'readTsv', 
                'plot',
                'table',
                'console',
                `
                "use strict";
                const window = undefined;
                const global = undefined;
                const process = undefined;
                const require = undefined;
                const module = undefined;
                const exports = undefined;
                const eval = undefined;
                const Function = undefined;
                
                return (async function() {
                    try {
                        ${code}
                    } catch (error) {
                        console.error("Error in user code:", error);
                        throw error;
                    }
                })();
                `
            );

            const result = safeEval(
                context.readYaml,
                context.readTsv,
                context.plot,
                context.table,
                context.console
            );

            // Handle both promise and non-promise returns
            if (result && typeof result.then === 'function') {
                await result;
            }
        } catch (error: any) {
            console.error("Sandbox execution error:", error);
            throw new Error(`Execution failed: ${error.message}`);
        }
    }

    private resolvePath(path: string, currentFilePath?: string): string {
        if (path.startsWith('/')) {
            // Absolute path within vault
            return path.substring(1);
        }

        if (currentFilePath) {
            // Relative path
            const currentDir = currentFilePath.split('/').slice(0, -1).join('/');
            if (currentDir) {
                return `${currentDir}/${path}`;
            }
        }

        return path;
    }

    private createTable(container: HTMLElement, rows: Array<Record<string, any>>, opts: TableOptions): HTMLElement {
        const { columns, pageSize = 50 } = opts;
        
        if (rows.length === 0) {
            const emptyDiv = container.createDiv('simplejs-table-empty');
            emptyDiv.setText('No data to display');
            return emptyDiv;
        }

        // Determine columns to show
        const allColumns = Object.keys(rows[0]);
        const displayColumns = columns || allColumns;

        // Create table
        const table = container.createEl('table', { cls: 'simplejs-table' });
        
        // Create header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        displayColumns.forEach(col => {
            headerRow.createEl('th', { text: col });
        });

        // Create body with pagination
        const tbody = table.createEl('tbody');
        const displayRows = rows.slice(0, pageSize);

        displayRows.forEach(row => {
            const tr = tbody.createEl('tr');
            displayColumns.forEach(col => {
                const value = row[col];
                const cellText = value === null ? '' : String(value);
                tr.createEl('td', { text: cellText });
            });
        });

        // Add pagination info if needed
        if (rows.length > pageSize) {
            const info = container.createDiv('simplejs-table-info');
            info.setText(`Showing ${displayRows.length} of ${rows.length} rows`);
        }

        return table;
    }

    private serializeForLog(arg: any): string {
        if (typeof arg === 'string') {
            return arg;
        }
        try {
            return JSON.stringify(arg);
        } catch {
            return String(arg);
        }
    }

    dispose(): void {
        this.plotlyRenderer.dispose();
    }
}