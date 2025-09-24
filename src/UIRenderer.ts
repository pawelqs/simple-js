export class UIRenderer {
    
    createOutputContainer(element: HTMLElement): OutputContainer {
        element.empty();
        const container = element.createDiv('simplejs-container');
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
        
        return new OutputContainer(container, content);
    }

    showLoading(container: HTMLElement, message = 'Executing...'): HTMLElement {
        const loading = container.createDiv('simplejs-loading');
        loading.textContent = message;
        loading.style.color = 'var(--text-muted)';
        loading.style.fontStyle = 'italic';
        return loading;
    }

    showSuccess(container: HTMLElement, message = 'Code executed successfully'): void {
        const successDiv = container.createDiv('simplejs-success');
        successDiv.textContent = `✅ ${message}`;
        successDiv.style.color = 'var(--text-success)';
        successDiv.style.padding = '8px';
    }

    showError(container: HTMLElement, message: string): void {
        const errorDiv = container.createDiv('simplejs-error');
        errorDiv.style.padding = '12px';
        errorDiv.style.background = 'var(--background-modifier-error)';
        errorDiv.style.border = '1px solid var(--text-error)';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.color = 'var(--text-error)';
        errorDiv.style.margin = '8px 0';
        
        const title = errorDiv.createEl('strong');
        title.textContent = 'SimpleJS Error: ';
        errorDiv.createSpan({ text: message });
        
        console.error('[SimpleJS] Error:', message);
    }

    createTable(container: HTMLElement, rows: any[], options: TableOptions = {}): void {
        if (!Array.isArray(rows) || rows.length === 0) {
            const emptyDiv = container.createDiv('simplejs-empty');
            emptyDiv.textContent = 'No data to display';
            emptyDiv.style.color = 'var(--text-muted)';
            emptyDiv.style.padding = '16px';
            emptyDiv.style.textAlign = 'center';
            return;
        }
        
        const table = container.createEl('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.margin = '8px 0';
        table.style.fontSize = '0.9em';
        
        const columns = options.columns || Object.keys(rows[0]);
        
        // Create header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        columns.forEach((col: string) => {
            const th = headerRow.createEl('th');
            th.textContent = col;
            th.style.padding = '8px 12px';
            th.style.background = 'var(--background-secondary)';
            th.style.border = '1px solid var(--background-modifier-border)';
            th.style.textAlign = 'left';
            th.style.fontWeight = '600';
        });
        
        // Create body
        const tbody = table.createEl('tbody');
        const displayRows = rows.slice(0, options.pageSize || 50);
        
        displayRows.forEach(row => {
            const tr = tbody.createEl('tr');
            tr.style.borderBottom = '1px solid var(--background-modifier-border-hover)';
            
            columns.forEach((col: string) => {
                const td = tr.createEl('td');
                const value = row[col];
                td.textContent = value === null || value === undefined ? '' : String(value);
                td.style.padding = '6px 12px';
                td.style.border = '1px solid var(--background-modifier-border)';
            });
            
            // Hover effect
            tr.addEventListener('mouseenter', () => {
                tr.style.background = 'var(--background-modifier-hover)';
            });
            tr.addEventListener('mouseleave', () => {
                tr.style.background = '';
            });
        });
        
        // Add pagination info if truncated
        if (rows.length > displayRows.length) {
            const info = container.createDiv('simplejs-table-info');
            info.textContent = `Showing ${displayRows.length} of ${rows.length} rows`;
            info.style.fontSize = '0.8em';
            info.style.color = 'var(--text-muted)';
            info.style.marginTop = '4px';
            info.style.padding = '4px 8px';
        }
    }

    addConsoleOutput(container: HTMLElement, type: 'log' | 'warn' | 'error', message: string): void {
        const consoleDiv = container.createDiv('simplejs-console-line');
        consoleDiv.style.padding = '4px 8px';
        consoleDiv.style.margin = '2px 0';
        consoleDiv.style.fontFamily = 'var(--font-monospace)';
        consoleDiv.style.fontSize = '0.85em';
        consoleDiv.style.background = 'var(--background-secondary)';
        consoleDiv.style.borderRadius = '3px';
        consoleDiv.style.border = '1px solid var(--background-modifier-border)';
        
        const prefix = consoleDiv.createSpan();
        prefix.textContent = `[${type.toUpperCase()}] `;
        prefix.style.fontWeight = 'bold';
        prefix.style.color = type === 'error' ? 'var(--text-error)' : 
                            type === 'warn' ? '#ff8c00' : 'var(--text-muted)';
        
        consoleDiv.createSpan({ text: message });
    }

    addControlBar(container: HTMLElement, onRerun: () => void): void {
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
        rerunBtn.style.background = 'var(--interactive-normal)';
        rerunBtn.style.border = '1px solid var(--background-modifier-border)';
        rerunBtn.style.borderRadius = '3px';
        rerunBtn.style.cursor = 'pointer';
        rerunBtn.onclick = onRerun;
        
        // Hover effect
        rerunBtn.addEventListener('mouseenter', () => {
            rerunBtn.style.background = 'var(--interactive-hover)';
        });
        rerunBtn.addEventListener('mouseleave', () => {
            rerunBtn.style.background = 'var(--interactive-normal)';
        });
    }
}

export class OutputContainer {
    constructor(
        public readonly container: HTMLElement,
        public readonly content: HTMLElement
    ) {}
}

export interface TableOptions {
    columns?: string[];
    pageSize?: number;
}