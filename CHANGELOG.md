# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- **Migrate to TypeScript on Bun + MCP 2.0.** Replace the Python FastMCP stack
  (`server.py`, `fmcp/`, `pyproject.toml`, `uv.lock`) with a Bun TypeScript
  server using `@modelcontextprotocol/server` 2.0 (`serveStdio` /
  `createMcpHandler`). Tool names and module prefixes (`numpy_mcp_*`,
  `sympy_mcp_*`, `mpl_mcp_*`) are preserved. Numerical work uses `ml-matrix`;
  symbolic work uses `nerdamer`; plots emit SVG. CI and Docker now target Bun.

### Security (2026-08-04)

- `cryptography` 49.0.0 -> 50.0.0 (high). Cleared via
  `uv lock --upgrade-package cryptography`; `pyproject.toml` unchanged.


### Added

- **Windows CI leg.** CI ran on `ubuntu-latest` only — but Windows is the *production*
  platform for this MCP server (it runs on the user's Windows box), so CI had never once
  tested the OS the server actually ships on. The `test` job now runs a
  `[ubuntu-latest, windows-latest]` matrix.

### Security
- **Patched transitive dependency vulnerabilities** (via `fastmcp`) by upgrading them in `uv.lock`: `cryptography` 47.0.0 → 49.0.0 (HIGH), `starlette` 1.2.1 → 1.3.1 (HIGH), `pyjwt` 2.12.1 → 2.13.0, `pydantic-settings` 2.14.0 → 2.14.2, `python-multipart` 0.0.27 → 0.0.32. All are indirect (the project only declares `fastmcp`); `uv sync` + a server import smoke test pass with the new versions.
- **Close arbitrary-code-execution path in `plot_equation` (`eqn_chart.py`).** The equation string was passed to `eval()` with a globals dict that omitted `__builtins__`; Python then auto-injects the real builtins module, leaving `__import__`/`open`/`exec` reachable. The `name(`→`np.name(` regex was only an incidental guard and was bypassable with `(...)(...)` call syntax (e.g. `(__import__('os').system)('...')` survived unchanged). Equations are now rejected if they contain `__`, and the eval namespace sets `__builtins__` to `{}`, so a caller-supplied expression can only reference the provided math names. Verified that prior bypass payloads are blocked and legitimate expressions (e.g. `sin(x) + x^2`) still evaluate. (Full pytest suite not run locally — `pytest_asyncio` and runtime deps absent in the dev shell; the security property was verified via a direct evaluation probe.)

### Fixed
- Removed an unused `collections.abc.Sequence` import in `test/test_mpl/test_plot_chart.py` (ruff F401); `ruff check .` now passes.

### Documentation
- Add CycloneDX SBOM (sbom.json).
- Declare MIT license in `pyproject.toml` so package metadata reads `License: MIT` instead of `UNKNOWN` (matches existing `LICENSE` file at repo root).
