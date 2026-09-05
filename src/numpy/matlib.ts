/** Matrix-creation helpers (NumPy matlib-inspired). */

import type { NestedNumber } from "./numerical.ts";
import { numericalOperation } from "./numerical.ts";

export interface MatlibArgs {
  operation: string;
  data?: NestedNumber | null;
  shape?: number[] | number | null;
  m?: number | null;
  n?: number | null;
  k?: number;
  start?: number | null;
  stop?: number | null;
  step?: number | null;
  num?: number | null;
  axis?: number;
}

function eye(m: number, n: number, k: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      row.push(j - i === k ? 1 : 0);
    }
    out.push(row);
  }
  return out;
}

function randMat(m: number, n: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) row.push(Math.random());
    out.push(row);
  }
  return out;
}

export function matlibOperation(args: MatlibArgs): NestedNumber {
  const {
    operation,
    data = null,
    shape = null,
    m = null,
    n = null,
    k = 0,
    start = null,
    stop = null,
    step = null,
    num = null,
    axis = 0,
  } = args;

  const shapeArr: number[] | null =
    shape == null ? null : Array.isArray(shape) ? shape : [shape];

  switch (operation) {
    case "zeros":
      if (!shapeArr) throw new Error("shape required for zeros");
      return numericalOperation({ operation: "zeros", shape: shapeArr }) as NestedNumber;
    case "ones":
      if (!shapeArr) throw new Error("shape required for ones");
      return numericalOperation({ operation: "ones", shape: shapeArr }) as NestedNumber;
    case "eye": {
      const rows = m ?? n;
      if (rows == null) throw new Error("m or n required for eye");
      const cols = n ?? rows;
      return eye(rows, cols, k);
    }
    case "identity":
      if (n == null) throw new Error("n required for identity");
      return eye(n, n, 0);
    case "rand-mat": {
      const rows = m ?? 1;
      const cols = n ?? rows;
      return randMat(rows, cols);
    }
    case "arange":
      if (start == null || stop == null)
        throw new Error("start and stop required for arange");
      return numericalOperation({
        operation: "arange",
        start,
        stop,
        step: step ?? 1,
      }) as NestedNumber;
    case "linspace":
      if (start == null || stop == null || num == null)
        throw new Error("start, stop, and num required for linspace");
      return numericalOperation({
        operation: "linspace",
        start,
        stop,
        num,
      }) as NestedNumber;
    case "reshape":
      if (data == null || !shapeArr)
        throw new Error("data and shape required for reshape");
      return numericalOperation({
        operation: "reshape",
        a: data,
        new_shape: shapeArr,
      }) as NestedNumber;
    case "flatten":
      if (data == null) throw new Error("data required for flatten");
      return numericalOperation({
        operation: "flatten",
        a: data,
      }) as NestedNumber;
    case "concatenate":
      if (data == null) throw new Error("data required for concatenate");
      return numericalOperation({
        operation: "concatenate",
        a: data,
        axis,
      }) as NestedNumber;
    case "transpose":
      if (data == null) throw new Error("data required for transpose");
      return numericalOperation({
        operation: "transpose",
        a: data,
      }) as NestedNumber;
    case "stack":
      if (data == null) throw new Error("data required for stack");
      return numericalOperation({
        operation: "stack",
        a: data,
        axis,
      }) as NestedNumber;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
