# Debug Example

Let's start with a simple test to make sure everything is working:

```simplejs
// First, let's just test console output
console.log("SimpleJS is working!");

// Test basic data
const testData = [
  { date: "2015-01-01", value: 16 },
  { date: "2025-02-01", value: 14 }
];

console.log("Test data:", testData);
table(testData);
```

If that works, then try loading the YAML:

```simplejs
// Load and inspect the YAML data
const y = await readYaml("dane.yml");
console.log("YAML data loaded:", y);

// Show the raw structure in a table
table([y]);
```

And if that works, try the full parsing:

```simplejs
const y = await readYaml("dane.yml");
console.log("YAML loaded:", y);

const parseSeries = (entries) => {
  console.log("Parsing entries:", entries);
  return entries.map(obj => {
    const [date, value] = Object.entries(obj)[0];
    console.log("Parsing:", date, "->", value);
    return { date, value: Number(value) };
  });
};

const fat = parseSeries(y.body_fat_pct);
const mass = parseSeries(y.body_mass);

console.log("Parsed fat:", fat);
console.log("Parsed mass:", mass);

table(fat);
```