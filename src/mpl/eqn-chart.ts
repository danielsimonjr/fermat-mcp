import { create, all } from "mathjs";
import { normalizeExpr, assertSafeExpr } from "../sympy/safe-parse.ts";
import { renderChart } from "./svg.ts";

// mathjs typings mark `all` as possibly undefined under exactOptionalPropertyTypes-ish configs
const math = create(all!);

export function eqnChart(args: {
  equations: string | string[];
  x_min?: number;
  x_max?: number;
  num_points?: number;
  title?: string;
  xlabel?: string;
  ylabel?: string;
  grid?: boolean;
  legend?: boolean;
}): string {
  const {
    equations,
    x_min = -10,
    x_max = 10,
    num_points = 400,
    title = "Equation Plot",
    xlabel = "x",
    ylabel = "y",
    grid = true,
    legend = true,
  } = args;

  const eqs = Array.isArray(equations) ? equations : [equations];
  const xs: number[] = [];
  for (let i = 0; i < num_points; i++) {
    xs.push(x_min + ((x_max - x_min) * i) / Math.max(num_points - 1, 1));
  }

  const series = [];
  for (const eq of eqs) {
    assertSafeExpr(eq);
    const expr = normalizeExpr(eq);
    let compiled: { evaluate: (scope: Record<string, unknown>) => unknown };
    try {
      compiled = math.compile(expr);
    } catch (err) {
      console.error(`Error compiling equation '${eq}':`, err);
      continue;
    }

    const ys: number[] = [];
    for (const x of xs) {
      try {
        const y = Number(
          compiled.evaluate({
            x,
            pi: Math.PI,
            e: Math.E,
          }),
        );
        ys.push(Number.isFinite(y) ? y : NaN);
      } catch {
        ys.push(NaN);
      }
    }

    series.push({
      x: xs,
      y: ys,
      kind: "line" as const,
      label: `y = ${eq}`,
    });
  }

  return renderChart(series, { title, xlabel, ylabel, grid, legend });
}
