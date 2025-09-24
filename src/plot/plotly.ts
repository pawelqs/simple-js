import { SimpleJSPluginSettings } from '../settings';

// Type definitions for Plotly
declare global {
    interface Window {
        Plotly: any;
    }
}

export interface PlotSpec {
    data: any[];
    layout?: any;
    config?: any;
}

export class PlotlyRenderer {
    private plotlyLoaded = false;
    private loadPromise: Promise<void> | null = null;

    constructor(private settings: SimpleJSPluginSettings) {}

    async ensurePlotlyLoaded(): Promise<void> {
        if (this.plotlyLoaded) {
            return;
        }

        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = this.loadPlotly();
        return this.loadPromise;
    }

    private async loadPlotly(): Promise<void> {
        try {
            if (this.settings.loadStrategy === 'dynamic') {
                // Dynamic import
                try {
                    const Plotly = await import('plotly.js-dist-min');
                    (window as any).Plotly = Plotly.default || Plotly;
                } catch (error) {
                    // Fallback: try to load via CDN
                    console.warn('Failed to load bundled Plotly, attempting CDN fallback');
                    await this.loadPlotlyFromCDN();
                }
            } else {
                // For bundle strategy, Plotly should already be available
                // This would require bundling Plotly with the plugin
                if (!(window as any).Plotly) {
                    throw new Error('Plotly not available in bundle mode');
                }
            }
            
            this.plotlyLoaded = true;
        } catch (error) {
            console.error('Failed to load Plotly:', error);
            throw new Error(`Failed to load Plotly: ${error.message}`);
        }
    }

    async createPlot(container: HTMLElement, spec: PlotSpec): Promise<void> {
        await this.ensurePlotlyLoaded();
        
        const Plotly = (window as any).Plotly;
        
        // Apply theme-based styling
        const themedLayout = this.applyTheme(spec.layout || {});
        
        // Default responsive config
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['sendDataToCloud'],
            ...spec.config
        };

        try {
            // Create the plot
            await Plotly.newPlot(container, spec.data, themedLayout, config);
            
            // Make it responsive
            window.addEventListener('resize', () => {
                Plotly.Plots.resize(container);
            });
            
        } catch (error: any) {
            console.error('Plotly render error:', error);
            throw new Error(`Failed to render plot: ${error.message}`);
        }
    }

    private applyTheme(layout: any): any {
        const theme = this.getEffectiveTheme();
        
        // Create a copy of the layout to avoid modifying the original
        const themedLayout = { ...layout };
        
        if (theme === 'dark') {
            // Apply dark theme
            themedLayout.paper_bgcolor = themedLayout.paper_bgcolor || '#1e1e1e';
            themedLayout.plot_bgcolor = themedLayout.plot_bgcolor || '#1e1e1e';
            
            // Apply dark theme to font
            themedLayout.font = {
                color: '#ffffff',
                ...themedLayout.font
            };
            
            // Apply dark theme to axes
            if (!themedLayout.xaxis) themedLayout.xaxis = {};
            if (!themedLayout.yaxis) themedLayout.yaxis = {};
            if (!themedLayout.yaxis2) themedLayout.yaxis2 = {};
            
            themedLayout.xaxis.color = themedLayout.xaxis.color || '#ffffff';
            themedLayout.xaxis.gridcolor = themedLayout.xaxis.gridcolor || '#404040';
            themedLayout.xaxis.zerolinecolor = themedLayout.xaxis.zerolinecolor || '#606060';
            
            themedLayout.yaxis.color = themedLayout.yaxis.color || '#ffffff';
            themedLayout.yaxis.gridcolor = themedLayout.yaxis.gridcolor || '#404040';
            themedLayout.yaxis.zerolinecolor = themedLayout.yaxis.zerolinecolor || '#606060';
            
            themedLayout.yaxis2.color = themedLayout.yaxis2.color || '#ffffff';
            themedLayout.yaxis2.gridcolor = themedLayout.yaxis2.gridcolor || '#404040';
            themedLayout.yaxis2.zerolinecolor = themedLayout.yaxis2.zerolinecolor || '#606060';
            
        } else {
            // Apply light theme
            themedLayout.paper_bgcolor = themedLayout.paper_bgcolor || '#ffffff';
            themedLayout.plot_bgcolor = themedLayout.plot_bgcolor || '#ffffff';
            
            // Apply light theme to font
            themedLayout.font = {
                color: '#000000',
                ...themedLayout.font
            };
            
            // Apply light theme to axes
            if (!themedLayout.xaxis) themedLayout.xaxis = {};
            if (!themedLayout.yaxis) themedLayout.yaxis = {};
            if (!themedLayout.yaxis2) themedLayout.yaxis2 = {};
            
            themedLayout.xaxis.color = themedLayout.xaxis.color || '#000000';
            themedLayout.xaxis.gridcolor = themedLayout.xaxis.gridcolor || '#e0e0e0';
            themedLayout.xaxis.zerolinecolor = themedLayout.xaxis.zerolinecolor || '#969696';
            
            themedLayout.yaxis.color = themedLayout.yaxis.color || '#000000';
            themedLayout.yaxis.gridcolor = themedLayout.yaxis.gridcolor || '#e0e0e0';
            themedLayout.yaxis.zerolinecolor = themedLayout.yaxis.zerolinecolor || '#969696';
            
            themedLayout.yaxis2.color = themedLayout.yaxis2.color || '#000000';
            themedLayout.yaxis2.gridcolor = themedLayout.yaxis2.gridcolor || '#e0e0e0';
            themedLayout.yaxis2.zerolinecolor = themedLayout.yaxis2.zerolinecolor || '#969696';
        }
        
        return themedLayout;
    }

    private getEffectiveTheme(): 'light' | 'dark' {
        if (this.settings.defaultTheme === 'auto') {
            // Detect Obsidian theme
            return document.body.hasClass('theme-dark') ? 'dark' : 'light';
        }
        
        return this.settings.defaultTheme;
    }

    /**
     * Validate plot specification
     */
    validatePlotSpec(spec: PlotSpec): string[] {
        const errors: string[] = [];
        
        if (!spec.data || !Array.isArray(spec.data)) {
            errors.push('Plot spec must have a data array');
            return errors;
        }
        
        if (spec.data.length === 0) {
            errors.push('Plot data array cannot be empty');
            return errors;
        }
        
        // Check each data trace
        spec.data.forEach((trace, index) => {
            if (!trace.type) {
                errors.push(`Trace ${index}: missing type`);
            }
            
            if (trace.type === 'scatter') {
                if (!trace.x && !trace.y) {
                    errors.push(`Trace ${index}: scatter plot needs x or y data`);
                }
            }
            
            if (trace.x && trace.y && Array.isArray(trace.x) && Array.isArray(trace.y)) {
                if (trace.x.length !== trace.y.length) {
                    console.warn(`Trace ${index}: x and y arrays have different lengths (${trace.x.length} vs ${trace.y.length})`);
                }
            }
        });
        
        return errors;
    }

    /**
     * Create a plot toolbar with common actions
     */
    createPlotToolbar(container: HTMLElement, plotElement: HTMLElement): HTMLElement {
        const toolbar = container.createDiv('simplejs-plot-toolbar');
        
        // Re-run button
        const rerunBtn = toolbar.createEl('button', {
            text: 'Re-run',
            cls: 'simplejs-toolbar-btn'
        });
        rerunBtn.onclick = () => {
            // This will be handled by the executor
            container.dispatchEvent(new CustomEvent('simplejs-rerun'));
        };
        
        // Download PNG button
        const downloadBtn = toolbar.createEl('button', {
            text: 'PNG',
            cls: 'simplejs-toolbar-btn'
        });
        downloadBtn.onclick = async () => {
            try {
                const Plotly = (window as any).Plotly;
                const url = await Plotly.toImage(plotElement, { format: 'png', width: 800, height: 600 });
                
                const link = document.createElement('a');
                link.download = 'plot.png';
                link.href = url;
                link.click();
            } catch (error) {
                console.error('Failed to download plot:', error);
            }
        };
        
        // Full screen button
        const fullscreenBtn = toolbar.createEl('button', {
            text: 'Expand',
            cls: 'simplejs-toolbar-btn'
        });
        fullscreenBtn.onclick = () => {
            plotElement.classList.toggle('simplejs-plot-fullscreen');
        };
        
        return toolbar;
    }

    /**
     * Dispose of Plotly resources
     */
    private async loadPlotlyFromCDN(): Promise<void> {
        return new Promise((resolve, reject) => {
            if ((window as any).Plotly) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.plot.ly/plotly-2.26.0.min.js';
            script.onload = () => {
                if ((window as any).Plotly) {
                    resolve();
                } else {
                    reject(new Error('Plotly not available after CDN load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load Plotly from CDN'));
            document.head.appendChild(script);
        });
    }

    dispose(): void {
        // Clean up any global resources if needed
        this.plotlyLoaded = false;
        this.loadPromise = null;
    }
}