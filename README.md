# SimpleJS Plugin for Obsidian

The goal of this plugin is to execute code in 

```simplejs

```

chunks and render results in the note view.

For example, this code reads data from a YAML file and creates a plot:

```simplejs
// dane.yml should contain:
// x: [1, 2, 3, 4]
// y: [10, 20, 15, 25]

const yamlText = await app.vault.adapter.read("dane.yml");
const data = parseYaml(yamlText); // { x: number[], y: number[] }

const plotDiv = document.createElement("div");
await Plotly.newPlot(
  plotDiv,
  [
    {
      x: data.x,
      y: data.y,
      type: "scatter",
      mode: "lines+markers",
      marker: { color: "#1f77b4" }
    }
  ],
  {
    margin: { t: 20, r: 10, b: 40, l: 50 },
    xaxis: { title: "x" },
    yaxis: { title: "y" }
  }
);

// Return the element to render it in the note
plotDiv
```
