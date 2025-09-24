# Complete SimpleJS Plugin Test

This demonstrates the complete functionality with the improvements learned from the existing obsidian-plotly plugin.

## Features Implemented

✅ **Working code block processor** - Now properly registered and executing  
✅ **Beautiful, styled output containers** with headers and controls  
✅ **YAML file reading** with custom parser for the demo data structure  
✅ **TSV file reading** with automatic type coercion  
✅ **Plotly integration** with CDN loading and theme support  
✅ **Table rendering** with proper styling  
✅ **Console output** with styled log messages  
✅ **Settings tab** with theme and timeout controls  
✅ **Error handling** with helpful messages  
✅ **Re-run functionality** built into each output  

## Test 1: Console Output

```simplejs
console.log("Hello from SimpleJS!");
console.warn("This is a warning message");
console.error("This is an error message (for demo)");

const data = { name: "test", values: [1, 2, 3, 4, 5] };
console.log("Sample data object:", data);
```

## Test 2: YAML Data Loading and Table

```simplejs
const y = await readYaml("dane.yml");
console.log("Loaded YAML data:", y);

const parseSeries = (entries) =>
  entries.map(obj => {
    const [date, value] = Object.entries(obj)[0];
    return { date, value: Number(value) };
  });

const fat = parseSeries(y.body_fat_pct);
const mass = parseSeries(y.body_mass);

console.log("Parsed body fat data:", fat);
console.log("Parsed body mass data:", mass);

// Show data in tables
table(fat, { columns: ["date", "value"] });
table(mass, { columns: ["date", "value"] });
```

## Test 3: TSV Data Loading

```simplejs
const rows = await readTsv("dane.tsv");
console.log("Loaded TSV data:", rows);

// Display the TSV data
table(rows, {
  columns: ["date", "body_fat_pct", "body_mass"],
  pageSize: 10
});
```

## Test 4: Complete Plot Example (YAML)

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
      yaxis: "y1",
      line: { color: "#1f77b4" },
      marker: { size: 8 }
    },
    {
      type: "scatter",
      mode: "lines+markers", 
      name: "Body mass (kg)",
      x: mass.map(d => d.date),
      y: mass.map(d => d.value),
      yaxis: "y2",
      line: { color: "#ff7f0e" },
      marker: { size: 8 }
    }
  ],
  layout: {
    title: {
      text: "Body Metrics Over Time",
      font: { size: 16 }
    },
    xaxis: { 
      type: "date", 
      title: "Date",
      gridcolor: "#e0e0e0"
    },
    yaxis: { 
      title: "Body fat (%)",
      titlefont: { color: "#1f77b4" },
      tickfont: { color: "#1f77b4" }
    },
    yaxis2: { 
      title: "Body mass (kg)", 
      overlaying: "y", 
      side: "right",
      titlefont: { color: "#ff7f0e" },
      tickfont: { color: "#ff7f0e" }
    },
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98
    },
    margin: { t: 40, r: 60, b: 40, l: 60 }
  },
  config: {
    displayModeBar: true,
    modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d']
  }
});
```

## Test 5: TSV Plot with Missing Data Handling

```simplejs
const rows = await readTsv("dane.tsv");

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
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
      connectgaps: false,  // Show gaps for missing data
      line: { color: "#2ca02c", width: 3 }
    },
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Body mass (kg)",
      x: rows.map(r => r.date),
      y: rows.map(r => toNum(r.body_mass)),
      connectgaps: false,  // Show gaps for missing data  
      line: { color: "#d62728", width: 3 }
    }
  ],
  layout: {
    title: "Body Metrics from TSV (with missing data)",
    xaxis: { type: "date", title: "Date" },
    yaxis: { title: "Values" },
    hovermode: "x unified"
  }
});
```

## Improvements from existing obsidian-plotly plugin:

1. **Better integration**: Direct `plot()` function instead of `window.renderPlotly()`
2. **File reading**: Built-in YAML/TSV support with path resolution
3. **Sandboxed execution**: Safer code execution environment  
4. **Styled output**: Professional-looking output containers
5. **Error handling**: Better error messages with hints
6. **Console integration**: Styled console output within blocks
7. **Settings integration**: Theme support and configurable timeouts
8. **Re-run functionality**: Easy re-execution without refreshing page

## Usage Instructions:

1. Replace your plugin's `main.js` with the new version
2. Restart Obsidian
3. Try the examples above
4. Check Settings → SimpleJS for configuration options
5. Use the Re-run button in each output to re-execute code