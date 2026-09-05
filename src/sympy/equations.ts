import nerdamer from "nerdamer";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Solve.js";
import { normalizeExpr, assertSafeExpr } from "./safe-parse.ts";

export type EquationOp = "solve" | "solveset" | "linsolve" | "nonlinsolve";

export interface EquationArgs {
  operation: EquationOp;
  equations: string | string[];
  symbols?: string | string[] | null;
  domain?: string | null;
  check?: boolean;
  simplify?: boolean;
}

function asList(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function parseEquation(eq: string): string {
  const e = normalizeExpr(eq.trim());
  if (e.includes("=") && !e.startsWith("Eq(")) {
    const [left, right] = e.split("=", 2);
    return `(${left})-(${right})`;
  }
  return e;
}

export function equationOperation(args: EquationArgs): string {
  const { operation, equations, symbols = null } = args;
  const eqs = asList(equations).map(parseEquation);
  const syms =
    symbols == null
      ? null
      : asList(symbols).map((s) => {
          assertSafeExpr(s);
          return s;
        });

  switch (operation) {
    case "solve":
    case "solveset": {
      const sym = syms?.[0];
      if (!sym) {
        // Infer first free variable when possible
        const sol = nerdamer.solve(eqs[0]!, "x");
        return sol.toString();
      }
      if (eqs.length === 1) {
        return nerdamer.solve(eqs[0]!, sym).toString();
      }
      // Multi-eq: use solveEquations
      const system = asList(equations).map((eq) => normalizeExpr(eq));
      const solved = nerdamer.solveEquations(system);
      return JSON.stringify(solved);
    }
    case "linsolve":
    case "nonlinsolve": {
      if (!syms || syms.length === 0) {
        throw new Error(`Symbols must be provided for ${operation}`);
      }
      const system = asList(equations).map((eq) => {
        const e = normalizeExpr(eq);
        return e.includes("=") ? e : `${e}=0`;
      });
      const solved = nerdamer.solveEquations(system);
      // nerdamer returns [var, val, var, val, ...]
      const pairs: Record<string, string> = {};
      for (let i = 0; i + 1 < solved.length; i += 2) {
        pairs[String(solved[i])] = String(solved[i + 1]);
      }
      const ordered = syms.map((s) => pairs[s] ?? null);
      return JSON.stringify([ordered]);
    }
    default:
      throw new Error(`Invalid operation: ${operation}`);
  }
}
