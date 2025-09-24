# SimpleJS Plugin Test

This note contains test examples for the SimpleJS plugin.

## YAML Example

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

## TSV Example

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

## Table Example

```simplejs
const rows = await readTsv("dane.tsv");

console.log("Data loaded:", rows.length, "rows");

// Show data in a table
table(rows, {
  columns: ["date", "body_fat_pct", "body_mass"],
  pageSize: 10
});
```

## Simple Console Test

```simplejs
console.log("Hello from SimpleJS!");
console.warn("This is a warning");
console.error("This is an error message");

const data = { name: "test", values: [1, 2, 3] };
console.log("Data object:", data);
```