import { Plugin } from 'obsidian';

export default class SimpleJSPlugin extends Plugin {
    async onload() {
        console.log('SimpleJS: Plugin loading...');
        
        // Try registering multiple processors to test
        console.log('SimpleJS: Registering code block processors...');
        
        // Test with 'simplejs'
        try {
            this.registerMarkdownCodeBlockProcessor('simplejs', (source, el, ctx) => {
                console.log('SimpleJS: SIMPLEJS block found!', source);
                el.empty();
                el.createDiv({ text: '✅ SIMPLEJS block processed!', cls: 'success' });
            });
            console.log('SimpleJS: ✅ simplejs processor registered');
        } catch (error) {
            console.error('SimpleJS: ❌ Failed to register simplejs processor:', error);
        }
        
        // Test with 'js' as fallback
        try {
            this.registerMarkdownCodeBlockProcessor('js', (source, el, ctx) => {
                console.log('SimpleJS: JS block found!', source);
                el.empty();
                el.createDiv({ text: '✅ JS block processed!', cls: 'success' });
            });
            console.log('SimpleJS: ✅ js processor registered');
        } catch (error) {
            console.error('SimpleJS: ❌ Failed to register js processor:', error);
        }
        
        // Test with 'test' 
        try {
            this.registerMarkdownCodeBlockProcessor('test', (source, el, ctx) => {
                console.log('SimpleJS: TEST block found!', source);
                el.empty();
                el.createDiv({ text: '✅ TEST block processed!', cls: 'success' });
            });
            console.log('SimpleJS: ✅ test processor registered');
        } catch (error) {
            console.error('SimpleJS: ❌ Failed to register test processor:', error);
        }
        
        // Add a general interceptor to see what's happening
        console.log('SimpleJS: Trying to access app.metadataCache...');
        console.log('SimpleJS: app object:', this.app);
        console.log('SimpleJS: vault object:', this.app.vault);
        
        // Monitor file changes to see if our plugin is active
        this.app.vault.on('modify', (file) => {
            console.log('SimpleJS: File modified:', file.path);
        });
        
        console.log('SimpleJS: Plugin loaded successfully');
    }

    onunload() {
        console.log('SimpleJS: Plugin unloaded');
    }
}