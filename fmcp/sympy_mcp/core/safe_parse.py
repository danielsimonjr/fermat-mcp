"""Safe parsing helpers for user-supplied SymPy expressions.

`sympy.sympify` is documented as unsafe for untrusted input because it falls
back to ``eval`` on the parsed token stream with sympy's full namespace —
payloads such as ``__import__('os').system('...')`` smuggled through
``Symbol`` tricks have historically worked. Because this MCP server is
exposed to a model that may itself be prompt-injected, every conversion of a
user string into a SymPy object must avoid that codepath.

These helpers wrap ``sympy.parsing.sympy_parser.parse_expr`` with:
- ``local_dict={}``: nothing user-supplied can shadow names.
- ``global_dict=_SAFE_GLOBALS``: only the symbolic primitives that
  ``parse_expr``'s tokenizer transformations emit (``Integer``, ``Float``,
  ``Symbol``, ``Rational``, ``Function``) plus a vetted whitelist of common
  math functions and constants. Critically, ``__import__`` and other
  builtins are NOT present, so attribute-walk attacks like
  ``__import__('os').system(...)`` raise ``AttributeError`` before any
  side effect is observed.
- ``transformations=standard_transformations``: implicit multiplication and
  numeric-literal handling, but none of the auto-eval transformations.
"""

from typing import Optional, Union

import sympy
from sympy import Basic, Float, Function, Integer, Rational, Symbol
from sympy.parsing.sympy_parser import parse_expr, standard_transformations


# Names that ``parse_expr``'s tokenizer/transformations emit. Without these
# the parser raises ``NameError: name 'Integer' is not defined`` on simple
# numeric inputs, because empty ``global_dict={}`` leaves the eval frame with
# no symbolic primitives at all.
_SAFE_GLOBALS = {
    # Required by parse_expr internals
    "Symbol": Symbol,
    "Integer": Integer,
    "Float": Float,
    "Rational": Rational,
    "Function": Function,
    # Common functions / constants users of a calculator MCP expect
    "sin": sympy.sin,
    "cos": sympy.cos,
    "tan": sympy.tan,
    "asin": sympy.asin,
    "acos": sympy.acos,
    "atan": sympy.atan,
    "atan2": sympy.atan2,
    "sinh": sympy.sinh,
    "cosh": sympy.cosh,
    "tanh": sympy.tanh,
    "asinh": sympy.asinh,
    "acosh": sympy.acosh,
    "atanh": sympy.atanh,
    "exp": sympy.exp,
    "log": sympy.log,
    "ln": sympy.log,
    "sqrt": sympy.sqrt,
    "Abs": sympy.Abs,
    "sign": sympy.sign,
    "floor": sympy.floor,
    "ceiling": sympy.ceiling,
    "factorial": sympy.factorial,
    "gamma": sympy.gamma,
    "Min": sympy.Min,
    "Max": sympy.Max,
    "pi": sympy.pi,
    "E": sympy.E,
    "I": sympy.I,
    "oo": sympy.oo,
    "zoo": sympy.zoo,
    "nan": sympy.nan,
    "true": sympy.true,
    "false": sympy.false,
}


def safe_sympify(expr: Union[str, Basic, int, float, None]) -> Optional[Basic]:
    """Convert ``expr`` to a SymPy object without invoking ``eval`` on
    arbitrary names.

    Strings are routed through ``parse_expr`` with a tightly scoped
    ``global_dict`` and an empty ``local_dict``. Already-SymPy objects are
    returned unchanged. ``None`` returns ``None`` to keep the call-site
    semantics that previous ``sympify(None)`` users depended on.
    """
    if expr is None:
        return None
    if isinstance(expr, Basic):
        return expr
    text = expr if isinstance(expr, str) else str(expr)
    return parse_expr(
        text,
        local_dict={},
        global_dict=_SAFE_GLOBALS,
        transformations=standard_transformations,
        evaluate=True,
    )
