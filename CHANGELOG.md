# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Security
- **Close arbitrary-code-execution path in `plot_equation` (`eqn_chart.py`).** The equation string was passed to `eval()` with a globals dict that omitted `__builtins__`; Python then auto-injects the real builtins module, leaving `__import__`/`open`/`exec` reachable. The `name(`→`np.name(` regex was only an incidental guard and was bypassable with `(...)(...)` call syntax (e.g. `(__import__('os').system)('...')` survived unchanged). Equations are now rejected if they contain `__`, and the eval namespace sets `__builtins__` to `{}`, so a caller-supplied expression can only reference the provided math names. Verified that prior bypass payloads are blocked and legitimate expressions (e.g. `sin(x) + x^2`) still evaluate. (Full pytest suite not run locally — `pytest_asyncio` and runtime deps absent in the dev shell; the security property was verified via a direct evaluation probe.)

### Fixed
- Removed an unused `collections.abc.Sequence` import in `test/test_mpl/test_plot_chart.py` (ruff F401); `ruff check .` now passes.

### Documentation
- Add CycloneDX SBOM (sbom.json).
- Declare MIT license in `pyproject.toml` so package metadata reads `License: MIT` instead of `UNKNOWN` (matches existing `LICENSE` file at repo root).
