import nerdamer from "nerdamer";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Solve.js";
import { normalizeExpr } from "./safe-parse.ts";

export type AlgebraOp = "simplify" | "expand" | "factor" | "collect";

export interface AlgebraArgs {
  operation: AlgebraOp;
  expr: string;
  syms?: string | string[] | null;
  rational?: boolean;
  ratio?: number;
  deep?: boolean;
  evaluate?: boolean;
  exact?: boolean;
}

export function algebraOperation(args: AlgebraArgs): string {
  const { operation, expr, syms = null } = args;
  const e = normalizeExpr(expr);

  switch (operation) {
    case "simplify":
      return nerdamer(`simplify(${e})`).text("fractions");
    case "expand":
      return nerdamer(e).expand().text("fractions");
    case "factor":
      return nerdamer.factor(e).text("fractions");
    case "collect": {
      if (syms == null) {
        throw new Error("Symbols must be provided for 'collect' operation");
      }
      const symList = Array.isArray(syms) ? syms : [syms];
      const sym = symList[0]!;
      // Group by powers of `sym` using coeffs when polynomial in that symbol.
      try {
        const coeffs = nerdamer(`coeffs(${e}, ${sym})`);
        const arr = coeffs.evaluate().text().replace(/^\[|\]$/g, "").split(",");
        const terms: string[] = [];
        for (let i = 0; i < arr.length; i++) {
          const c = arr[i]!.trim();
          if (!c || c === "0") continue;
          if (i === 0) terms.push(`(${c})`);
          else if (i === 1) terms.push(`(${c})*${sym}`);
          else terms.push(`(${c})*${sym}^${i}`);
        }
        return terms.length ? terms.join(" + ") : "0";
      } catch {
        return nerdamer(e).text("fractions");
      }
    }
    default:
      throw new Error(`Invalid operation: ${operation}`);
  }
}
