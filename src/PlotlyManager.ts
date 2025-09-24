import { SimpleJSSettings } from './simple-settings';

export class PlotlyManager {
    private plotlyLoaded = false;

    constructor(private settings: SimpleJSSettings) {}

    async createPlot(container: HTMLElement, spec: PlotSpec): Promise<void> {
        await this.ensurePlotlyLoaded();
        
        const plotContainer = container.createDiv('simplejs-plot');
        plotContainer.style.minHeight = '400px';
        plotContainer.style.margin = '8px 0';
        
        const Plotly = (window as any).Plotly;
        const layout = this.applyTheme(spec.layout || {});
        
        try {
            await Plotly.newPlot(plotContainer, spec.data, layout, {
                responsive: true,
                displaylogo: false,
                ...spec.config
            });
        } catch (error: any) {
            plotContainer.textContent = `Plot error: ${error.message}`;
            plotContainer.style.color = 'var(--text-error)';
            throw error;
        }
    }

    async ensurePlotlyLoaded(): Promise<void> {
        if (this.plotlyLoaded && (window as any).Plotly) {
            return;
        }

        if (!this.settings.autoLoadPlotly) {
            throw new Error('Plotly loading is disabled in settings');
        }

        if (!(window as any).Plotly) {
            await this.loadPlotlyFromCDN();
        }
        this.plotlyLoaded = true;
    }

    clearCache(): void {
        this.plotlyLoaded = false;
        delete (window as any).Plotly;
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

    private applyTheme(layout: any): any {
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
}

export interface PlotSpec {
    data: any[];
    layout?: any;
    config?: any;
}