import { Plugin } from 'obsidian';

export default class SimpleJSPlugin extends Plugin {
    async onload() {
        console.log('SimpleJS: Plugin loading...');
        
        // Test registration with minimal code
        this.registerMarkdownCodeBlockProcessor(
            'simplejs',
            (source, el, ctx) => {
                console.log('SimpleJS: Code block found! Source:', source);
                
                // Clear and add test content
                el.empty();
                const container = el.createDiv('simplejs-test');
                container.style.padding = '10px';
                container.style.background = '#f0f0f0';
                container.style.border = '1px solid #ccc';
                container.style.borderRadius = '4px';
                
                container.createEl('h4', { text: 'SimpleJS Test Output' });
                container.createEl('p', { text: `Code: ${source.substring(0, 100)}...` });
                container.createEl('p', { text: `File: ${ctx.sourcePath}` });
                
                // Try to execute the code as a simple test
                try {
                    const result = eval(`(function() { ${source}; return "Code executed successfully"; })()`);
                    container.createEl('p', { 
                        text: `Result: ${result}`,
                        cls: 'success'
                    });
                } catch (error: any) {
                    container.createEl('p', { 
                        text: `Error: ${error.message}`,
                        cls: 'error'
                    });
                }
            }
        );
        
        console.log('SimpleJS: Plugin loaded successfully');
    }

    onunload() {
        console.log('SimpleJS: Plugin unloaded');
    }
}