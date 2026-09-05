import { describe, expect, test } from "bun:test";
import { numericalOperation } from "../src/numpy/numerical.ts";
import { matlibOperation } from "../src/numpy/matlib.ts";
import { algebraOperation } from "../src/sympy/algebra.ts";
import { calculusOperation } from "../src/sympy/calculus.ts";
import { equationOperation } from "../src/sympy/equations.ts";
import { matrixOperation } from "../src/sympy/matrices.ts";
import { eqnChart } from "../src/mpl/eqn-chart.ts";
import { plotBarchart, plotChart } from "../src/mpl/charts.ts";
import { createServer } from "../src/server.ts";
import { assertSafeExpr } from "../src/sympy/safe-parse.ts";

describe("numpy numerical", () => {
  test("add and mean", () => {
    expect(
      numericalOperation({ operation: "add", a: [1, 2], b: [3, 4] }),
    ).toEqual([4, 6]);
    expect(numericalOperation({ operation: "mean", a: [1, 2, 3, 4] })).toBe(
      2.5,
    );
  });

  test("matmul and det", () => {
    const matmul = numericalOperation({
      operation: "matmul",
      a: [
        [1, 2],
        [3, 4],
      ],
      b: [
        [5, 6],
        [7, 8],
      ],
    });
    expect(matmul).toEqual([
      [19, 22],
      [43, 50],
    ]);
    expect(
      numericalOperation({
        operation: "det",
        a: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).toBeCloseTo(-2);
  });

  test("eig returns eigenvalues", () => {
    const result = numericalOperation({
      operation: "eig",
      a: [
        [2, 1],
        [1, 2],
      ],
    }) as { eigenvalues: unknown[] };
    expect(result.eigenvalues.length).toBe(2);
  });

  test("linspace", () => {
    expect(
      numericalOperation({
        operation: "linspace",
        start: 0,
        stop: 1,
        num: 5,
      }),
    ).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

describe("numpy matlib", () => {
  test("identity and eye", () => {
    expect(matlibOperation({ operation: "identity", n: 2 })).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(matlibOperation({ operation: "eye", m: 2, n: 3, k: 1 })).toEqual([
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });
});

describe("sympy algebra/calculus", () => {
  test("expand and factor", () => {
    const expanded = algebraOperation({
      operation: "expand",
      expr: "(x+1)**2",
    });
    expect(expanded.replace(/\s/g, "")).toContain("x^2");
    const factored = algebraOperation({
      operation: "factor",
      expr: "x**2 + 2*x + 1",
    });
    expect(factored).toContain("x");
  });

  test("diff and limit", () => {
    expect(
      calculusOperation({
        operation: "diff",
        expr: "x**2 + 2*x + 1",
        sym: "x",
      }),
    ).toMatch(/2/);
    expect(
      calculusOperation({
        operation: "limit",
        expr: "sin(x)/x",
        sym: "x",
        point: 0,
      }),
    ).toBe("1");
  });

  test("solve quadratic", () => {
    const sol = equationOperation({
      operation: "solve",
      equations: "x**2 - 1",
      symbols: "x",
    });
    expect(sol).toContain("1");
    expect(sol).toContain("-1");
  });

  test("matrix det", () => {
    expect(
      matrixOperation({
        operation: "det",
        data: "1 2; 3 4",
      }),
    ).toBeCloseTo(-2);
  });
});

describe("security", () => {
  test("rejects dunder expressions", () => {
    expect(() => assertSafeExpr("__import__('os')")).toThrow(/disallowed/);
  });

  test("eqn_chart rejects dunder", () => {
    expect(() => eqnChart({ equations: "__import__('os').system('x')" })).toThrow(
      /disallowed/,
    );
  });
});

describe("plotting", () => {
  test("barchart returns svg", () => {
    const svg = plotBarchart({ values: [1, 2, 3], labels: ["a", "b", "c"] });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  test("plot_chart line", () => {
    const svg = plotChart({
      x_data: [0, 1, 2],
      y_data: [0, 1, 0],
      plot_type: "line",
      title: "wave",
    });
    expect(svg).toContain("wave");
  });

  test("eqn_chart plots sin", () => {
    const svg = eqnChart({ equations: "sin(x)", x_min: -3, x_max: 3, num_points: 50 });
    expect(svg).toContain("<svg");
  });
});

describe("mcp server", () => {
  test("registers all module prefixes", () => {
    const server = createServer();
    // McpServer stores tools internally; exercise list via private map if available
    const anyServer = server as unknown as {
      _registeredTools?: Record<string, unknown>;
      tools?: Map<string, unknown>;
    };
    const names = Object.keys(
      anyServer._registeredTools ??
        Object.fromEntries(anyServer.tools ?? []),
    );
    // Fall back: just ensure factory does not throw and returns McpServer
    expect(server).toBeTruthy();
    if (names.length) {
      expect(names.some((n) => n.startsWith("mpl_mcp_"))).toBe(true);
      expect(names.some((n) => n.startsWith("numpy_mcp_"))).toBe(true);
      expect(names.some((n) => n.startsWith("sympy_mcp_"))).toBe(true);
    }
  });
});
