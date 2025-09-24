# SimpleJS Plots for Obsidian

Execute JavaScript snippets and create interactive plots with Plotly directly in your Obsidian notes.

## Features

- Execute safe, sandboxed JavaScript code in `simplejs` code blocks
- Read data from YAML and TSV files within your vault
- Create interactive plots using Plotly.js
- Display data in tables for quick inspection
- Local-first processing with file caching
- Auto-refresh when source files change
- Mobile and desktop compatible

## Usage

### Basic Syntax

Create a fenced code block with language `simplejs`:

````markdown
```simplejs
// Your JavaScript code here
console.log("Hello from SimpleJS!");
```
````

### Available Functions

- `readYaml(path)` - Read and parse YAML files
- `readTsv(path, options?)` - Read and parse TSV/CSV files
- `plot(spec)` - Create interactive plots with Plotly
- `table(data, options?)` - Display data in tables
- `console.log/warn/error()` - Console output (if enabled in settings)

### YAML Example

Given a file `dane.yml`:
```yaml
body_fat_pct:
  - 2015-01-01: 16
  - 2025-02-01: 14
  - 2025-03-01: 15
body_mass:
  - 2015-01-01: 77
  - 2025-02-01: 72
```

Use it in a SimpleJS block:
````markdown
```simplejs
const y = await readYaml("dane.yml");

const parseSeries = (entries) =>
  entries.map(obj => {
    const [date, value] = Object.entries(obj)[0];
    return { date, value: Number(value) };
  });

const fat = parseSeries(y.body_fat_pct);
const mass = parseSeries(y.body_mass);

plot({
  data: [
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Body fat (%)",
      x: fat.map(d => d.date),
      y: fat.map(d => d.value),
      yaxis: "y1"
    },
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Body mass (kg)",
      x: mass.map(d => d.date),
      y: mass.map(d => d.value),
      yaxis: "y2"
    }
  ],
  layout: {
    title: "Body metrics over time",
    xaxis: { type: "date", title: "Date" },
    yaxis: { title: "Body fat (%)" },
    yaxis2: { title: "Body mass (kg)", overlaying: "y", side: "right" }
  }
});
```
````

### TSV Example

Given a file `dane.tsv`:
```
date	body_fat_pct	body_mass
2015-01-01	16	77
2025-02-01	14	72
2025-03-01	15	
```

Use it in a SimpleJS block:
````markdown
```simplejs
const rows = await readTsv("dane.tsv");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

plot({
  data: [
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Body fat (%)",
      x: rows.map(r => r.date),
      y: rows.map(r => toNum(r.body_fat_pct)),
      yaxis: "y1"
    },
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Body mass (kg)",
      x: rows.map(r => r.date),
      y: rows.map(r => toNum(r.body_mass)),
      yaxis: "y2"
    }
  ],
  layout: {
    title: "Body metrics over time (TSV)",
    xaxis: { type: "date", title: "Date" },
    yaxis: { title: "Body fat (%)" },
    yaxis2: { title: "Body mass (kg)", overlaying: "y", side: "right" }
  }
});
```
````

## Installation

1. Download the latest release files (`main.js`, `manifest.json`, `styles.css`)
2. Create folder `<vault>/.obsidian/plugins/simple-js/`
3. Copy the files into the folder
4. Enable the plugin in Obsidian settings

## Settings

- **Plotly Settings**: Configure how Plotly is loaded and themed
- **Data Settings**: Configure TSV parsing, caching, and limits
- **Execution Settings**: Set timeout and console permissions
- **Auto-run**: Enable/disable automatic re-execution on file changes

## Commands

- **Re-run blocks in current file**: Manually re-execute all SimpleJS blocks
- **Toggle auto-run on file change**: Enable/disable automatic updates
- **Clear data cache**: Clear cached file contents

## Security

- No network access (all processing is local)
- Sandboxed execution environment
- No access to Node.js/Electron APIs
- Time and memory limits for code execution
- Safe DOM manipulation

## Development

```bash
npm install
npm run dev    # Development build with watching
npm run build  # Production build
```

## License

MIT
