## SimpleJS Plots for Obsidian — Specification

## Goal
Enable notes to execute small, safe code snippets inside `simplejs` code blocks that:
- Read tabular data from YAML and TSV files in the vault
- Transform/filter data in JavaScript
- Render interactive plots with Plotly in-place in the note

The plugin should be local-first, fast, and safe by default.

## Requirements

### Functional requirements
- Parse and load data from:
  - YAML (arrays of objects; scalars; nested structures)
  - TSV (header row required; UTF-8; configurable delimiter/decimal)
- Provide a minimal runtime API within `simplejs` blocks:
  - `readYaml(path: string): Promise<any>`
  - `readTsv(path: string, opts?: { delimiter?: string; decimal?: "." | ","; comment?: string; encoding?: string; maxRows?: number }): Promise<Array<Record<string, any>>>`
  - `plot(spec: { data: Plotly.Data[]; layout?: Partial<Plotly.Layout>; config?: Partial<Plotly.Config> }): void`
  - `table(rows: Array<Record<string, any>>, opts?: { columns?: string[]; pageSize?: number }): void` (optional helper for quick inspection)
- Execute code in an isolated, sandboxed environment with a small standard library (no Node/Electron APIs).
- Cache file reads while the note is open
- Re-execute on:
  - Note open / refresh
  - Explicit command: Re-run SimpleJS blocks in current file
  - Source file change (YAML/TSV) if referenced
- Bundle Plotly (or load via dynamic import) and render inline.

- No arbitrary network access.
- No cross-vault or filesystem access outside the vault.
- No long-running computations or background jobs.
- No Python/R execution; JavaScript only.

## User stories
- As a researcher, I want to visualize data stored in `dane.yml` and `dane.tsv` with minimal code.
- As an analyst, I want charts to refresh automatically when source files change.
- As a privacy-conscious user, I want all processing to stay on-device.
- As a mobile user, I want reasonable performance without desktop-only APIs.

## UX

Place code in fenced code blocks with language `simplejs`:

### YAML example

`dane.yml`:

```yaml
body_fat_pct:
  - 2015-01-01: 16
  - 2025-02-01: 14
  - 2025-03-01: 15
body_mass:
  - 2015-01-01: 77
  - 2025-02-01: 72
```

Note:

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

### TSV example

TSV example (`dane.tsv`):

```tsv
date	body_fat_pct	body_mass
2015-01-01	16	77
2025-02-01	14	72
2025-03-01	15	
```

Note:

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

## Design

### Obsidian integration
- Lifecycle: extend `Plugin`; implement `onload`/`onunload`.
- Code block execution: `this.registerMarkdownCodeBlockProcessor("simplejs", async (source, el, ctx) => { /* run sandbox, render into el */ })`.
  - Use only safe DOM builders (`el.createDiv`, `createEl`) for output; avoid `innerHTML` with untrusted content.
  - Respect Reading mode rendering; in Source mode, do not execute.
- Commands: register with `this.addCommand({ id, name, callback })`; do not set default hotkeys.
- Settings tab: implement `PluginSettingTab` and register via `this.addSettingTab(...)`.
- Cleanup: register all listeners/intervals/loaders with `this.register*` helpers so they are disposed on unload.
- Mobile: avoid Node/Electron APIs to keep mobile compatibility.

### Runtime API (in `simplejs` sandbox)
- `await readYaml(path)`
  - Resolves paths relative to the current note unless absolute within vault (`/path/in/vault`).
  - Returns parsed YAML; for documents with multiple top-level items, return last document by default.
  - Supports structures like in the example: keys mapping to arrays of single-entry objects, e.g. `{ body_fat_pct: [ {"2015-01-01": 16}, ... ] }`.
  - Errors on invalid YAML with line/column info.

- `await readTsv(path, opts)`
  - Parses header row into column names; trims whitespace.
  - `opts.delimiter` default `"\t"`; support alt delimiters (e.g., `","`) for CSV-as-TSV use.
  - `opts.decimal` default `"."`; when `","`, numeric coercion respects comma decimal.
  - `opts.comment` default `"#"`; ignore lines starting with comment.
  - `opts.maxRows` safety cap (default 100_000) to prevent large-memory usage.
  - Returns `Array<Record<string, string | number | null>>` with best-effort type coercion for numeric columns.
  - Blank cells are returned as `null` (as in `body_mass` third row in the example) to produce gaps in Plotly traces.

- `plot({ data, layout, config })`
  - Renders a Plotly figure inline within the code block’s output container.
  - Multiple calls render multiple figures stacked.
  - Figures are responsive by default.
  - Dates may be passed as ISO strings; set `xaxis.type = "date"` (as in examples) for time-series rendering.

- `table(rows, opts)` (optional convenience)
  - Renders a lightweight, virtualized table for quick inspection.

### Data typing and date handling
- The runtime does not auto-parse dates; examples pass ISO `YYYY-MM-DD` strings directly to Plotly which interprets them as dates when `xaxis.type = "date"`.
- Numeric coercion is best-effort. Helper functions (like `toNum`) can be used in `simplejs` to coerce values and keep blanks as `null`.
- YAML example shows arrays of single-entry objects; use a helper (like `parseSeries`) to transform into `{ date, value }` objects.

### Execution & sandbox
- Each `simplejs` block runs in an isolated VM context.
- Provided globals: `readYaml`, `readTsv`, `plot`, `table`, `console` (mirrored to Obsidian devtools), and a curated subset of standard JS (no `require`, no filesystem, no process/env).
- Hard time limit per block (default 2s) and memory guardrails. Abort on deadline.
- Deterministic re-runs on demand; cache invalidation triggers re-exec.

### File resolution & caching
- Resolve relative paths from the note’s directory.
- Normalize and ensure target is inside the vault.

### Plot conventions (aligned with examples)
- Dual-axis charts: use `yaxis` (left) and `yaxis2` (right) with `overlaying: "y"` on `yaxis2`.
- Preferred trace style: `scatter` with `mode: "lines+markers"` for time series.
- Series naming via `name` is encouraged for legend clarity.

## Settings (with sensible defaults)
- Plotly
  - `loadStrategy`: `"bundle" | "dynamic"` (default `"dynamic"`)
  - `defaultTheme`: `"light" | "dark" | "auto"` (default `"auto"`)
- Data
  - `tsvDelimiter`: default `"\t"`
  - `decimalSeparator`: default `"."`
  - `maxRows`: default `100000`
  - `cacheFiles`: default `true`
- Execution
  - `timeoutMs`: default `2000`
  - `allowConsole`: default `true`
- Security
  - `allowNetwork`: default `false` (locked in v1)

## Commands
- `simplejs: Re-run blocks in current file`
- `simplejs: Toggle auto-run on file change`
- `simplejs: Clear data cache`

### UI behavior
- Output appears directly beneath each `simplejs` block in Reading mode; collapsible container with a small toolbar:
  - Re-run, Copy image (PNG/SVG), Download HTML, Expand
- Errors are shown inline with stack and a concise hint.
- Respect Obsidian light/dark themes for Plotly background and grid.

### Performance
- Lazy-load Plotly only when a block with `plot()` is executed.
- Virtualize large tables; paginate if needed.
- Debounce re-exec on rapid file changes.

### Security & privacy
- No network access.
- No access outside the vault.
- No telemetry.
- Sandboxed execution with time/memory limits; safe APIs only.
 - Construct DOM with Obsidian helpers (`createEl`, `createDiv`) to avoid XSS.

### Error handling
- Data load errors: show filename, line/column (YAML), row number (TSV), and a short fix suggestion.
- Plot errors: show Plotly validation errors succinctly with a link to affected trace index.
- When a block fails, preserve previous successful output until re-run, with a visible error banner.

## Implementation outline
- `src/main.ts`: plugin lifecycle, settings tab, command registration
- `src/runtime/sandbox.ts`: VM context creation, allowed globals, timeout
- `src/io/yaml.ts`: YAML parsing (js-yaml), error mapping
- `src/io/tsv.ts`: TSV/CSV parsing (custom or PapaParse in browser mode), type coercion
- `src/plot/plotly.ts`: dynamic loader, render helpers, theming
- `src/executor/index.ts`: find `simplejs` blocks in view, run, manage output containers, cache
- `src/settings.ts`: settings schema and UI

## Build & artifacts
- Tooling: npm + esbuild
- Entry: `main.ts` → `main.js`
- Release artifacts: `main.js`, `manifest.json`, `styles.css` (optional)

## Testing & validation
- Manual: copy artifacts to `<Vault>/.obsidian/plugins/<plugin-id>/`
- Provide sample note with working examples against `dane.yml` and `dane.tsv`.
- Add lightweight unit tests for TSV/YAML parsing and path resolution (if test harness present).

## Obsidian compliance checklist
- Manifest contains: `id` (stable), `name`, `version` (SemVer), `minAppVersion`, `description`, `isDesktopOnly`, optional author fields.
- Tag releases with the exact `version` (no leading `v`); attach `manifest.json`, `main.js`, and `styles.css` (if any).
- Maintain `versions.json` mapping plugin versions → minimum app version.
- Stable command IDs; no default hotkeys.
- Local-first; no hidden telemetry; clear settings and documentation for any optional external calls (none in v1).
- Use `this.app` context; register and dispose all resources with `this.register*` APIs.



