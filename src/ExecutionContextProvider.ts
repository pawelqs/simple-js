import { DataReader } from './DataReader';
import { PlotlyManager, PlotSpec } from './PlotlyManager';
import { UIRenderer, TableOptions } from './UIRenderer';
import { ExecutionContext } from './CodeExecutor';
import { SimpleJSSettings } from './simple-settings';

export class ExecutionContextProvider {
    
    constructor(
        private dataReader: DataReader,
        private plotlyManager: PlotlyManager,
        private uiRenderer: UIRenderer,
        private settings: SimpleJSSettings
    ) {}

    createContext(outputContainer: HTMLElement, currentFile?: string): ExecutionContext {
        return {
            readYaml: async (path: string) => {
                console.log('SimpleJS: Reading YAML:', path);
                return await this.dataReader.readYaml(path, currentFile);
            },

            readTsv: async (path: string, options: any = {}) => {
                console.log('SimpleJS: Reading TSV:', path);
                const finalOptions = {
                    delimiter: '\t',
                    decimal: '.',
                    maxRows: this.settings.timeoutMs,
                    ...options
                };
                return await this.dataReader.readTsv(path, currentFile, finalOptions);
            },

            plot: async (spec: PlotSpec) => {
                console.log('SimpleJS: Creating plot');
                await this.plotlyManager.createPlot(outputContainer, spec);
            },

            table: (rows: any[], options: TableOptions = {}) => {
                console.log('SimpleJS: Creating table with', rows?.length || 0, 'rows');
                this.uiRenderer.createTable(outputContainer, rows, options);
            },

            console: this.createConsoleProxy(outputContainer)
        };
    }

    private createConsoleProxy(outputContainer: HTMLElement) {
        return {
            log: (...args: any[]) => {
                if (this.settings.allowConsole) {
                    const message = this.formatConsoleArgs(args);
                    console.log('[SimpleJS]', ...args);
                    this.uiRenderer.addConsoleOutput(outputContainer, 'log', message);
                }
            },

            warn: (...args: any[]) => {
                if (this.settings.allowConsole) {
                    const message = this.formatConsoleArgs(args);
                    console.warn('[SimpleJS]', ...args);
                    this.uiRenderer.addConsoleOutput(outputContainer, 'warn', message);
                }
            },

            error: (...args: any[]) => {
                if (this.settings.allowConsole) {
                    const message = this.formatConsoleArgs(args);
                    console.error('[SimpleJS]', ...args);
                    this.uiRenderer.addConsoleOutput(outputContainer, 'error', message);
                }
            }
        };
    }

    private formatConsoleArgs(args: any[]): string {
        return args.map(arg => {
            if (typeof arg === 'string') {
                return arg;
            } else if (arg === null) {
                return 'null';
            } else if (arg === undefined) {
                return 'undefined';
            } else {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
        }).join(' ');
    }
}