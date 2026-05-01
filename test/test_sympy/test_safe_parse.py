"""Regression tests for the safe-parse hardening.

These pin the behavior that user-supplied strings reaching sympy MCP tools
cannot trigger arbitrary code execution via the documented `sympify`/`eval`
codepath. If any of these tests fails, the security fix has been undone.
"""

import pytest

from fmcp.sympy_mcp.core.safe_parse import safe_sympify


def test_safe_sympify_basic_expr():
    e = safe_sympify("x**2 + 2*x + 1")
    assert str(e) == "x**2 + 2*x + 1"


def test_safe_sympify_passes_through_basic():
    e1 = safe_sympify("x + 1")
    # Already a SymPy object the second time
    assert safe_sympify(e1) is e1


def test_safe_sympify_handles_none():
    assert safe_sympify(None) is None


def test_safe_sympify_handles_numeric_inputs():
    assert int(safe_sympify(3)) == 3
    assert float(safe_sympify(2.5)) == 2.5


def test_safe_sympify_supports_common_math():
    e = safe_sympify("sin(x)**2 + cos(x)**2")
    # Should parse without exception
    assert "sin" in str(e) and "cos" in str(e)


def test_safe_sympify_blocks_import_attack(tmp_path):
    """The classic `__import__('os').system(...)` payload must NOT execute.

    We use a sentinel file: if the attack runs, the file gets written. If the
    parser is hardened, an exception is raised before any side effect.
    """
    sentinel = tmp_path / "pwned.txt"
    payload = (
        f"__import__('os').system('echo PWNED > {sentinel.as_posix()!s}')"
    )
    with pytest.raises(Exception):
        safe_sympify(payload)
    assert not sentinel.exists(), "Code injection executed despite hardening"


def test_safe_sympify_does_not_resolve_eval_to_builtin():
    """`eval(...)` in user input must not resolve to Python's builtin eval.

    parse_expr will accept `eval` as an undefined name and treat it as a
    symbolic Function — that is fine. What MUST NOT happen is that the
    builtin `eval` runs and returns the integer `2` from `1+1`. We confirm by
    checking the result is a SymPy expression containing the literal token
    `eval` rather than the Python int 2.
    """
    result = safe_sympify("eval(1+1)")
    assert "eval" in str(result), (
        f"`eval` resolved to a builtin and returned {result!r}"
    )


def test_safe_sympify_blocks_open(tmp_path):
    """`open(...)` must not be reachable from user input."""
    sentinel = tmp_path / "opened.txt"
    with pytest.raises(Exception):
        safe_sympify(f"open({sentinel.as_posix()!r}, 'w').write('x')")
    assert not sentinel.exists()
