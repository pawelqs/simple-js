# Plot Example

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