# Fermat MCP

[![smithery badge](https://smithery.ai/badge/@abhiphile/fermat-mcp)](https://smithery.ai/server/@abhiphile/fermat-mcp)

[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/16469d0f-0c4a-4b35-babf-4666107251f5)

MCP **2.0** server for mathematical computations — numerical, symbolic, and plotting — written in **TypeScript** and run on **Bun**.

## Modules

### 1. mpl_mcp — Plotting (SVG)

| Feature | Description |
|---------|-------------|
| `plot_barchart` | Plots bar charts of given data values |
| `plot_scatter` | Creates scatter plots from data points |
| `plot_chart` | Plots line, scatter, or bar charts |
| `plot_stem` | Creates stem plots for discrete data |
| `plot_stack` | Generates stacked area/bar charts |
| `eqn_chart` | Plots mathematical equations |

### 2. numpy_mcp — Numerical computation

| Category | Operations |
|----------|------------|
| **Basic Math** | add, sub, mul, div, power, abs, exp, log, sqrt |
| **Trigonometric** | sin, cos, tan |
| **Statistics** | mean, median, std, var, min, max, argmin, argmax, percentile |
| **Linear Algebra** | dot, matmul, inv, det, eig, solve, svd |
| **Matrix Operations** | create, zeros, ones, full, arange, linspace |
| **Array Manipulation** | reshape, flatten, concatenate, transpose, stack |

### 3. sympy_mcp — Symbolic computation

| Category | Operations |
|----------|------------|
| **Algebra** | simplify, expand, factor, collect |
| **Calculus** | diff, integrate, limit, series |
| **Equations** | solve, solveset, linsolve, nonlinsolve |
| **Matrix Operations** | create, det, inv, rref, eigenvals |

## Requirements

- [Bun](https://bun.sh) 1.2+ (installs Node-compatible tooling as needed)

## Setup

```bash
git clone https://github.com/danielsimonjr/fermat-mcp
cd fermat-mcp
bun install
```

### Run (stdio — local MCP clients)

```bash
bun run src/index.ts
# or
./setup.sh
```

### Run (HTTP — Smithery / containers)

```bash
SMITHERY_DEPLOYMENT=1 PORT=8081 bun run src/index.ts
```

## Client configuration

### Visual Studio Code / Windsurf / Cursor

Add to your `mcp.json`:

```json
{
  "mcpServers": {
    "fmcp": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/fermat-mcp/src/index.ts"],
      "description": "fmcp server is for mathematical computations, including numerical and symbolic calculations, as well as plotting."
    }
  }
}
```

Or via the setup script:

```json
{
  "mcpServers": {
    "fmcp": {
      "command": "bash",
      "args": ["/absolute/path/to/fermat-mcp/setup.sh"]
    }
  }
}
```

### Claude (Anthropic)

```json
{
  "mcpServers": {
    "fmcp": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/fermat-mcp/src/index.ts"]
    }
  }
}
```

### Gemini CLI

In `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "fmcp": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/fermat-mcp/src/index.ts"],
      "description": "fmcp server is for mathematical computations, including numerical and symbolic calculations, as well as plotting."
    }
  }
}
```

### Installing via Smithery

```bash
npx -y @smithery/cli install @abhiphile/fermat-mcp --client gemini
```

## Development

```bash
bun test          # unit tests
bun run typecheck # tsc --noEmit
```

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Bun |
| Language | TypeScript |
| Protocol | MCP TypeScript SDK **2.0** (`@modelcontextprotocol/server`) |
| Numerical LA | `ml-matrix` |
| Symbolic CAS | `nerdamer` (+ `mathjs` for equation plotting) |
| Charts | SVG (no native canvas dependency) |

## License

MIT
