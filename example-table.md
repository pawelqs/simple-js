# Table Example

```simplejs
const y = await readYaml("dane.yml");

const parseSeries = (entries) =>
  entries.map(obj => {
    const [date, value] = Object.entries(obj)[0];
    return { date, value: Number(value) };
  });

// Parse the data first
const fat = parseSeries(y.body_fat_pct);
const mass = parseSeries(y.body_mass);

// Combine into a single table
const combinedData = [];
const dateSet = new Set([...fat.map(d => d.date), ...mass.map(d => d.date)]);

Array.from(dateSet).sort().forEach(date => {
  const fatEntry = fat.find(f => f.date === date);
  const massEntry = mass.find(m => m.date === date);
  
  combinedData.push({
    date: date,
    body_fat_pct: fatEntry ? fatEntry.value : null,
    body_mass: massEntry ? massEntry.value : null
  });
});

table(combinedData);
```