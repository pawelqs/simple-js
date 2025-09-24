# Minimal Test

Try this super simple test first:

```simplejs
// Just test if the sandbox works at all
const x = 1 + 1;
console.log("Math works:", x);
```

If that works, try this:

```simplejs
// Test if we can create any output
const testEl = document.createElement("div");
testEl.textContent = "SimpleJS is working!";
// This should show something
```

If both fail, try this debug version:

```simplejs
try {
    console.log("Starting execution...");
    const result = "Hello World";
    console.log("Result:", result);
} catch (error) {
    console.error("Error in SimpleJS:", error);
}
```