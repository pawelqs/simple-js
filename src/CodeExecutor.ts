import { SimpleJSSettings } from './simple-settings';

export class CodeExecutor {
    
    constructor(private settings: SimpleJSSettings) {}

    async execute(code: string, context: ExecutionContext): Promise<void> {
        // Create execution promise
        const executionPromise = this.executeInSandbox(code, context);
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Execution timeout')), this.settings.timeoutMs);
        });
        
        // Race execution against timeout
        await Promise.race([executionPromise, timeoutPromise]);
    }

    private async executeInSandbox(code: string, context: ExecutionContext): Promise<void> {
        try {
            const safeEval = new Function(
                'readYaml', 'readTsv', 'plot', 'table', 'console',
                `
                "use strict";
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
            throw new Error(`Execution failed: ${error.message}`);
        }
    }

    validateCode(code: string): ValidationResult {
        const issues: string[] = [];
        
        // Check for potentially dangerous patterns
        const dangerousPatterns = [
            /eval\s*\(/,
            /Function\s*\(/,
            /import\s+/,
            /require\s*\(/,
            /process\./,
            /global\./,
            /__dirname/,
            /__filename/,
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
                issues.push(`Potentially unsafe pattern detected: ${pattern.source}`);
            }
        }
        
        // Check for basic syntax issues (simple check)
        const brackets = this.countBrackets(code);
        if (brackets.curly !== 0) {
            issues.push('Mismatched curly braces');
        }
        if (brackets.round !== 0) {
            issues.push('Mismatched parentheses');
        }
        if (brackets.square !== 0) {
            issues.push('Mismatched square brackets');
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }

    private countBrackets(code: string): BracketCount {
        let curly = 0;
        let round = 0;
        let square = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            const prevChar = i > 0 ? code[i - 1] : '';
            
            // Handle string literals
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
            }
            
            if (!inString) {
                switch (char) {
                    case '{': curly++; break;
                    case '}': curly--; break;
                    case '(': round++; break;
                    case ')': round--; break;
                    case '[': square++; break;
                    case ']': square--; break;
                }
            }
        }
        
        return { curly, round, square };
    }
}

export interface ExecutionContext {
    readYaml: (path: string) => Promise<any>;
    readTsv: (path: string, options?: any) => Promise<any[]>;
    plot: (spec: any) => Promise<void>;
    table: (rows: any[], options?: any) => void;
    console: {
        log: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
}

interface ValidationResult {
    isValid: boolean;
    issues: string[];
}

interface BracketCount {
    curly: number;
    round: number;
    square: number;
}