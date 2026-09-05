import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { textResult, errorResult, imageResult } from "./util.ts";
import { numericalOperation } from "./numpy/numerical.ts";
import { matlibOperation } from "./numpy/matlib.ts";
import { algebraOperation } from "./sympy/algebra.ts";
import { calculusOperation } from "./sympy/calculus.ts";
import { equationOperation } from "./sympy/equations.ts";
import { matrixOperation } from "./sympy/matrices.ts";
import {
  plotBarchart,
  plotScatter,
  plotChart,
  plotStem,
  plotStack,
} from "./mpl/charts.ts";
import { eqnChart } from "./mpl/eqn-chart.ts";

const nestedNumber = z.union([
  z.number(),
  z.array(z.number()),
  z.array(z.array(z.number())),
  z.array(z.array(z.array(z.number()))),
]);

function wrap<T>(fn: (args: T) => unknown) {
  return async (args: T) => {
    try {
      const result = fn(args);
      return textResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(message);
    }
  };
}

function wrapImage<T>(fn: (args: T) => string) {
  return async (args: T) => {
    try {
      return imageResult(fn(args));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(message);
    }
  };
}

/**
 * Factory used by both stdio and HTTP transports.
 * MCP 2.0 expects a fresh server instance per HTTP request.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "fmcp",
    version: "0.2.0",
  });

  server.registerTool(
    "numpy_mcp_numerical_operation",
    {
      description:
        "Do numerical operation like add, sub, mul, div, power, abs, exp, log, sqrt, sin, cos, tan, mean, median, std, var, min, max, argmin, argmax, percentile, dot, matmul, inv, det, eig, solve, svd",
      inputSchema: z.object({
        operation: z.string(),
        a: nestedNumber.optional().nullable(),
        b: nestedNumber.optional().nullable(),
        shape: z.array(z.number()).optional().nullable(),
        new_shape: z.array(z.number()).optional().nullable(),
        axis: z.number().optional().default(0),
        q: z.number().optional().nullable(),
        start: z.number().optional().nullable(),
        stop: z.number().optional().nullable(),
        step: z.number().optional().nullable(),
        num: z.number().int().optional().nullable(),
        fill_value: z.number().optional().nullable(),
      }),
    },
    wrap(numericalOperation),
  );

  server.registerTool(
    "numpy_mcp_matlib_operation",
    {
      description:
        "Do matrix operations: rand-mat, zeros, ones, eye, identity, arange, linspace, reshape, flatten, concatenate, transpose, stack",
      inputSchema: z.object({
        operation: z.string(),
        data: nestedNumber.optional().nullable(),
        shape: z.union([z.array(z.number()), z.number()]).optional().nullable(),
        m: z.number().int().optional().nullable(),
        n: z.number().int().optional().nullable(),
        k: z.number().int().optional().default(0),
        start: z.number().optional().nullable(),
        stop: z.number().optional().nullable(),
        step: z.number().optional().nullable(),
        num: z.number().int().optional().nullable(),
        axis: z.number().optional().default(0),
      }),
    },
    wrap(matlibOperation),
  );

  server.registerTool(
    "sympy_mcp_algebra_operation",
    {
      description:
        "Do algebraic operations like simplify, expand, factor, collect",
      inputSchema: z.object({
        operation: z.enum(["simplify", "expand", "factor", "collect"]),
        expr: z.string(),
        syms: z.union([z.string(), z.array(z.string())]).optional().nullable(),
        rational: z.boolean().optional(),
        ratio: z.number().optional(),
        deep: z.boolean().optional(),
        evaluate: z.boolean().optional(),
        exact: z.boolean().optional(),
      }),
    },
    wrap(algebraOperation),
  );

  server.registerTool(
    "sympy_mcp_calculus_operation",
    {
      description:
        "Do calculus operations like diff, integrate, limit, series",
      inputSchema: z.object({
        operation: z.enum(["diff", "integrate", "limit", "series"]),
        expr: z.string(),
        sym: z.string().optional().nullable(),
        n: z.number().int().optional().default(1),
        lower: z.union([z.number(), z.string()]).optional().nullable(),
        upper: z.union([z.number(), z.string()]).optional().nullable(),
        point: z.union([z.number(), z.string()]).optional().default(0),
        direction: z.enum(["+", "-"]).optional().default("+"),
        series_n: z.number().int().optional().default(6),
      }),
    },
    wrap(calculusOperation),
  );

  server.registerTool(
    "sympy_mcp_equation_operation",
    {
      description:
        "Do symbolic equation operations like solve, solveset, linsolve, nonlinsolve",
      inputSchema: z.object({
        operation: z.enum([
          "solve",
          "solveset",
          "linsolve",
          "nonlinsolve",
        ]),
        equations: z.union([z.string(), z.array(z.string())]),
        symbols: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .nullable(),
        domain: z.string().optional().nullable(),
        check: z.boolean().optional(),
        simplify: z.boolean().optional(),
      }),
    },
    wrap(equationOperation),
  );

  server.registerTool(
    "sympy_mcp_matrix_operation",
    {
      description:
        "Do symbolic matrix operations like create, det, inv, rref, eigenvals",
      inputSchema: z.object({
        operation: z.enum(["create", "det", "inv", "rref", "eigenvals"]),
        data: z.union([
          z.string(),
          z.array(z.union([z.string(), z.number()])),
          z.array(z.array(z.union([z.string(), z.number()]))),
        ]),
        rational: z.boolean().optional(),
        nrows: z.number().int().optional().nullable(),
        ncols: z.number().int().optional().nullable(),
        simplify: z.boolean().optional(),
      }),
    },
    wrap(matrixOperation),
  );

  server.registerTool(
    "mpl_mcp_plot_barchart",
    {
      description: "Plots barchart of given datavalues",
      inputSchema: z.object({
        values: z.array(z.number()),
        labels: z.array(z.string()).optional().nullable(),
        title: z.string().optional().default(""),
        xlabel: z.string().optional().default(""),
        ylabel: z.string().optional().default(""),
        color: z.string().optional().default("skyblue"),
        orientation: z
          .enum(["vertical", "horizontal"])
          .optional()
          .default("vertical"),
      }),
    },
    wrapImage(plotBarchart),
  );

  server.registerTool(
    "mpl_mcp_plot_scatter",
    {
      description: "Plots scatter chart of given datavalues",
      inputSchema: z.object({
        x_data: z.array(z.number()),
        y_data: z.array(z.number()),
        labels: z.union([z.string(), z.array(z.string())]).optional().nullable(),
        title: z.string().optional().default(""),
        xlabel: z.string().optional().default(""),
        ylabel: z.string().optional().default(""),
        color: z.union([z.string(), z.array(z.string())]).optional().default("blue"),
        grid: z.boolean().optional().default(true),
        legend: z.boolean().optional().default(false),
      }),
    },
    wrapImage(plotScatter),
  );

  server.registerTool(
    "mpl_mcp_plot_chart",
    {
      description: "Plots line/scatter/bar chart of given datavalues",
      inputSchema: z.object({
        x_data: z.array(z.number()),
        y_data: z.union([z.array(z.number()), z.array(z.array(z.number()))]),
        plot_type: z.enum(["line", "scatter", "bar"]).optional().default("line"),
        labels: z.union([z.string(), z.array(z.string())]).optional().nullable(),
        title: z.string().optional().default(""),
        xlabel: z.string().optional().default(""),
        ylabel: z.string().optional().default(""),
        color: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .default("skyblue"),
        grid: z.boolean().optional().default(true),
        legend: z.boolean().optional().default(false),
      }),
    },
    wrapImage(plotChart),
  );

  server.registerTool(
    "mpl_mcp_plot_stem",
    {
      description: "Plots stem chart of given datavalues",
      inputSchema: z.object({
        x_data: z.array(z.number()),
        y_data: z.union([z.array(z.number()), z.array(z.array(z.number()))]),
        labels: z.union([z.string(), z.array(z.string())]).optional().nullable(),
        title: z.string().optional().default(""),
        xlabel: z.string().optional().default(""),
        ylabel: z.string().optional().default(""),
        colors: z.union([z.string(), z.array(z.string())]).optional().default("blue"),
        grid: z.boolean().optional().default(true),
        legend: z.boolean().optional().default(false),
      }),
    },
    wrapImage(plotStem),
  );

  server.registerTool(
    "mpl_mcp_plot_stack",
    {
      description: "Plots stacked area/bar chart of given datavalues",
      inputSchema: z.object({
        x_data: z.array(z.number()),
        y_data: z.union([z.array(z.number()), z.array(z.array(z.number()))]),
        chart_type: z.enum(["area", "bar"]).optional().default("area"),
        labels: z.array(z.string()).optional().nullable(),
        title: z.string().optional().default(""),
        xlabel: z.string().optional().default(""),
        ylabel: z.string().optional().default(""),
        colors: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .nullable(),
        grid: z.boolean().optional().default(true),
        legend: z.boolean().optional().default(true),
      }),
    },
    wrapImage(plotStack),
  );

  server.registerTool(
    "mpl_mcp_eqn_chart",
    {
      description: "Plots mathematical equations",
      inputSchema: z.object({
        equations: z.union([z.string(), z.array(z.string())]),
        x_min: z.number().optional().default(-10),
        x_max: z.number().optional().default(10),
        num_points: z.number().int().optional().default(400),
        title: z.string().optional().default("Equation Plot"),
        xlabel: z.string().optional().default("x"),
        ylabel: z.string().optional().default("y"),
        grid: z.boolean().optional().default(true),
        legend: z.boolean().optional().default(true),
      }),
    },
    wrapImage(eqnChart),
  );

  return server;
}
