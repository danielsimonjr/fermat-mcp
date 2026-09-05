import nerdamer from "nerdamer";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Solve.js";
import { normalizeExpr, assertSafeExpr } from "./safe-parse.ts";

export type CalculusOp = "diff" | "integrate" | "limit" | "series";

export interface CalculusArgs {
  operation: CalculusOp;
  expr: string;
  sym?: string | null;
  n?: number;
  lower?: number | string | null;
  upper?: number | string | null;
  point?: number | string;
  direction?: "+" | "-";
  series_n?: number;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function taylorSeries(
  expr: string,
  sym: string,
  point: number | string,
  order: number,
): string {
  const terms: string[] = [];
  let f = nerdamer(expr);
  const pt = typeof point === "string" ? normalizeExpr(point) : String(point);

  for (let k = 0; k < order; k++) {
    const val = nerdamer(f).evaluate({ [sym]: nerdamer(pt) });
    const coef = nerdamer(`(${val.toString()})/${factorial(k)}`);
    const coefText = coef.text("fractions");
    if (coefText !== "0") {
      if (k === 0) terms.push(coefText);
      else if (k === 1)
        terms.push(`(${coefText})*(${sym}-(${pt}))`);
      else terms.push(`(${coefText})*(${sym}-(${pt}))^${k}`);
    }
    f = nerdamer.diff(f, sym);
  }
  return terms.length ? terms.join(" + ") : "0";
}

export function calculusOperation(args: CalculusArgs): string {
  const {
    operation,
    expr,
    sym = null,
    n = 1,
    lower = null,
    upper = null,
    point = 0,
    series_n = 6,
  } = args;

  const e = normalizeExpr(expr);
  if (sym != null) assertSafeExpr(sym);

  switch (operation) {
    case "diff": {
      if (sym == null)
        throw new Error("Symbol must be provided for differentiation");
      let result = nerdamer(e);
      for (let i = 0; i < n; i++) {
        result = nerdamer.diff(result, sym);
      }
      return result.text("fractions");
    }
    case "integrate": {
      if (sym == null)
        throw new Error("Symbol must be provided for integration");
      if (lower != null || upper != null) {
        const lo =
          typeof lower === "string" ? normalizeExpr(lower) : String(lower ?? 0);
        const hi =
          typeof upper === "string" ? normalizeExpr(upper) : String(upper ?? 0);
        const F = nerdamer.integrate(e, sym);
        const atHi = nerdamer(F).evaluate({ [sym]: nerdamer(hi) });
        const atLo = nerdamer(F).evaluate({ [sym]: nerdamer(lo) });
        return nerdamer(`(${atHi.toString()})-(${atLo.toString()})`).text(
          "fractions",
        );
      }
      return nerdamer.integrate(e, sym).text("fractions");
    }
    case "limit": {
      if (sym == null) throw new Error("Symbol must be provided for limit");
      const pt =
        typeof point === "string" ? normalizeExpr(point) : String(point);
      return nerdamer.limit(e, sym, pt).text("fractions");
    }
    case "series": {
      if (sym == null)
        throw new Error("Symbol must be provided for series expansion");
      return taylorSeries(e, sym, point, series_n);
    }
    default:
      throw new Error(`Invalid operation: ${operation}`);
  }
}
