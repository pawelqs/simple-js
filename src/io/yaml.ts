import * as yaml from 'js-yaml';
import { TFile, Vault } from 'obsidian';

export interface YamlError extends Error {
    line?: number;
    column?: number;
    filename?: string;
}

export class YamlLoader {
    constructor(private vault: Vault) {}

    async loadYaml(filePath: string): Promise<any> {
        try {
            // Get the file from vault
            const file = this.vault.getAbstractFileByPath(filePath);
            
            if (!file || !(file instanceof TFile)) {
                throw new Error(`YAML file not found: ${filePath}`);
            }

            // Read the file contents
            const content = await this.vault.read(file);
            
            // Parse YAML
            try {
                // Load all documents, but return the last one by default (as per spec)
                const documents = yaml.loadAll(content);
                
                if (documents.length === 0) {
                    return null;
                }
                
                // Return the last document if multiple, or the single document
                return documents[documents.length - 1];
                
            } catch (parseError: any) {
                // Enhance error with file information
                const yamlError = new Error(`YAML parse error in ${filePath}: ${parseError.message}`) as YamlError;
                yamlError.filename = filePath;
                
                // Extract line/column info if available
                if (parseError.mark) {
                    yamlError.line = parseError.mark.line + 1; // Convert to 1-based
                    yamlError.column = parseError.mark.column + 1; // Convert to 1-based
                }
                
                throw yamlError;
            }
            
        } catch (error: any) {
            // If it's already our enhanced error, re-throw
            if (error.filename) {
                throw error;
            }
            
            // Otherwise, create a new enhanced error
            const yamlError = new Error(`Failed to load YAML file ${filePath}: ${error.message}`) as YamlError;
            yamlError.filename = filePath;
            throw yamlError;
        }
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
    formatError(error: YamlError): string {
        let message = error.message;
        
        if (error.line && error.column) {
            message += ` (line ${error.line}, column ${error.column})`;
        } else if (error.line) {
            message += ` (line ${error.line})`;
        }
        
        // Add suggestion for common issues
        if (error.message.includes('duplicated mapping key')) {
            message += '\nSuggestion: Check for duplicate keys in your YAML file.';
        } else if (error.message.includes('bad indentation')) {
            message += '\nSuggestion: Check the indentation in your YAML file. Use spaces, not tabs.';
        } else if (error.message.includes('unexpected end of the stream')) {
            message += '\nSuggestion: Check that all YAML structures are properly closed.';
        }
        
        return message;
    }
}