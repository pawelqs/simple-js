import { App } from 'obsidian';

export class DataReader {
    constructor(private app: App) {}

    async readYaml(path: string, basePath?: string): Promise<any> {
        const resolvedPath = this.resolvePath(path, basePath);
        const file = this.app.vault.getAbstractFileByPath(resolvedPath);
        
        if (!file || !('stat' in file)) {
            throw new Error(`YAML file not found: ${resolvedPath}`);
        }
        
        const content = await this.app.vault.read(file as any);
        return this.parseSimpleYaml(content);
    }

    async readTsv(path: string, basePath?: string, options: TsvOptions = {}): Promise<any[]> {
        const resolvedPath = this.resolvePath(path, basePath);
        const file = this.app.vault.getAbstractFileByPath(resolvedPath);
        
        if (!file || !('stat' in file)) {
            throw new Error(`TSV file not found: ${resolvedPath}`);
        }
        
        const content = await this.app.vault.read(file as any);
        return this.parseTsv(content, options);
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

    private parseTsv(content: string, options: TsvOptions = {}): any[] {
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
}

export interface TsvOptions {
    delimiter?: string;
    decimal?: '.' | ',';
    comment?: string;
    maxRows?: number;
}