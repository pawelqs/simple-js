import * as Papa from 'papaparse';
import { TFile, Vault } from 'obsidian';

export interface TsvOptions {
    delimiter?: string;
    decimal?: '.' | ',';
    comment?: string;
    encoding?: string;
    maxRows?: number;
}

export interface TsvError extends Error {
    row?: number;
    column?: string;
    filename?: string;
}

export class TsvLoader {
    constructor(private vault: Vault) {}

    async loadTsv(filePath: string, options: TsvOptions = {}): Promise<Array<Record<string, any>>> {
        const opts = {
            delimiter: '\t',
            decimal: '.',
            comment: '#',
            encoding: 'utf-8',
            maxRows: 100000,
            ...options
        };

        try {
            // Get the file from vault
            const file = this.vault.getAbstractFileByPath(filePath);
            
            if (!file || !(file instanceof TFile)) {
                throw new Error(`TSV file not found: ${filePath}`);
            }

            // Read the file contents
            const content = await this.vault.read(file);
            
            // Filter out comment lines
            const lines = content.split('\n').filter(line => 
                line.trim() && !line.trim().startsWith(opts.comment!)
            );
            
            // Rejoin the filtered content
            const filteredContent = lines.join('\n');
            
            // Parse with PapaParse
            const parseResult = Papa.parse(filteredContent, {
                header: true,
                delimiter: opts.delimiter,
                skipEmptyLines: true,
                transformHeader: (header: string) => header.trim(),
            });

            if (parseResult.errors && parseResult.errors.length > 0) {
                const error = parseResult.errors[0];
                const tsvError = new Error(`TSV parse error in ${filePath}: ${error.message}`) as TsvError;
                tsvError.filename = filePath;
                tsvError.row = error.row ? error.row + 1 : undefined;
                throw tsvError;
            }

            let data = parseResult.data as Array<Record<string, string>>;
            
            // Apply max rows limit
            if (data.length > opts.maxRows!) {
                console.warn(`TSV file ${filePath} has ${data.length} rows, limiting to ${opts.maxRows}`);
                data = data.slice(0, opts.maxRows);
            }

            // Apply type coercion and handle decimal separator
            const result = data.map((row, index) => {
                const processedRow: Record<string, any> = {};
                
                for (const [key, value] of Object.entries(row)) {
                    if (value === null || value === undefined || value === '') {
                        processedRow[key] = null;
                    } else {
                        const stringValue = value.toString().trim();
                        
                        if (stringValue === '') {
                            processedRow[key] = null;
                        } else {
                            // Try to convert to number
                            processedRow[key] = this.coerceValue(stringValue, opts.decimal as '.' | ',');
                        }
                    }
                }
                
                return processedRow;
            });

            return result;
            
        } catch (error: any) {
            // If it's already our enhanced error, re-throw
            if (error.filename) {
                throw error;
            }
            
            // Otherwise, create a new enhanced error
            const tsvError = new Error(`Failed to load TSV file ${filePath}: ${error.message}`) as TsvError;
            tsvError.filename = filePath;
            throw tsvError;
        }
    }

    /**
     * Coerce a string value to the appropriate type (number, boolean, or string)
     */
    private coerceValue(value: string, decimalSeparator: '.' | ','): any {
        // Handle boolean-like values
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true') return true;
        if (lowerValue === 'false') return false;
        
        // Handle numeric values
        let numericValue = value;
        
        // Handle decimal separator
        if (decimalSeparator === ',') {
            // Replace comma with dot for parsing
            numericValue = value.replace(/,/g, '.');
        }
        
        // Try to parse as number
        const parsed = Number(numericValue);
        
        // Return number if it's finite, otherwise return original string
        return Number.isFinite(parsed) ? parsed : value;
    }

    /**
     * Validate that a file path is safe and within the vault
     */
    validatePath(filePath: string, basePath?: string): string {
        // Handle absolute paths within vault (starting with /)
        if (filePath.startsWith('/')) {
            return filePath.substring(1); // Remove leading slash
        }
        
        // Handle relative paths
        if (basePath) {
            // Get directory of the base file
            const baseDir = basePath.split('/').slice(0, -1).join('/');
            if (baseDir) {
                return `${baseDir}/${filePath}`;
            }
        }
        
        return filePath;
    }

    /**
     * Format error message for display to user
     */
    formatError(error: TsvError): string {
        let message = error.message;
        
        if (error.row) {
            message += ` (row ${error.row})`;
        }
        
        if (error.column) {
            message += ` (column: ${error.column})`;
        }
        
        // Add suggestions for common issues
        if (error.message.includes('Invalid delimiter')) {
            message += '\nSuggestion: Check that you\'re using the correct delimiter (tab, comma, etc.).';
        } else if (error.message.includes('Too few headers')) {
            message += '\nSuggestion: Ensure your file has a proper header row.';
        } else if (error.message.includes('file not found')) {
            message += '\nSuggestion: Check the file path and ensure the file exists in your vault.';
        }
        
        return message;
    }

    /**
     * Get basic statistics about the loaded data
     */
    getDataInfo(data: Array<Record<string, any>>): { rows: number; columns: string[]; numericColumns: string[] } {
        if (data.length === 0) {
            return { rows: 0, columns: [], numericColumns: [] };
        }
        
        const columns = Object.keys(data[0]);
        const numericColumns: string[] = [];
        
        // Check which columns contain numeric data
        for (const column of columns) {
            const hasNumeric = data.some(row => typeof row[column] === 'number');
            if (hasNumeric) {
                numericColumns.push(column);
            }
        }
        
        return {
            rows: data.length,
            columns,
            numericColumns
        };
    }
}