# UI Test Examples

Test the new success message positioning with these examples:

## Test 1: Success Message (No Output)
```simplejs
const x = 1 + 2;
const result = x * 10;
// No output generated - should show "Code executed successfully" in control bar
```

## Test 2: Console Output (Has Output)  
```simplejs
console.log("Hello from SimpleJS!");
console.log("This generates output, so no success message should appear");
```

## Test 3: Table Output (Has Output)
```simplejs
const data = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 }
];
table(data);
// Table is output - no success message should appear
```

## Test 4: Plot Output (Has Output)
```simplejs
const testData = {
  data: [{
    x: [1, 2, 3, 4],
    y: [2, 4, 3, 5],
    type: 'scatter',
    mode: 'lines+markers'
  }],
  layout: {
    title: 'Simple Test Plot',
    xaxis: { title: 'X Values' },
    yaxis: { title: 'Y Values' }
  }
};

plot(testData);
// Plot is output - no success message should appear
```

## Expected Behavior:
- **Test 1**: ✅ "Code executed successfully" appears in control bar (left side of Re-run button)
- **Test 2-4**: No success message (content area has output)