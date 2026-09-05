/**
 * Numerical array / linear-algebra operations (NumPy-inspired).
 * Uses typed Float64Array storage + ml-matrix for linear algebra.
 */

import {
  Matrix,
  EigenvalueDecomposition,
  SingularValueDecomposition,
  inverse,
  determinant,
  solve as mlSolve,
} from "ml-matrix";

export type NestedNumber = number | NestedNumber[];

function asMatrix(a: NestedNumber): Matrix {
  const arr = Array.isArray(a) ? a : [[a]];
  // Flatten one level of nesting detection
  if (arr.length > 0 && !Array.isArray(arr[0])) {
    return Matrix.rowVector(arr as number[]);
  }
  return new Matrix(arr as number[][]);
}

function toNested(m: Matrix): number[] | number[][] {
  const rows = m.to2DArray();
  if (rows.length === 1) return rows[0]!;
  if (rows.every((r) => r.length === 1)) return rows.map((r) => r[0]!);
  return rows;
}

function flatten(a: NestedNumber): number[] {
  if (!Array.isArray(a)) return [a];
  return a.flatMap((x) => flatten(x));
}

function shapeOf(a: NestedNumber): number[] {
  if (!Array.isArray(a)) return [];
  if (a.length === 0) return [0];
  if (!Array.isArray(a[0])) return [a.length];
  return [a.length, (a[0] as NestedNumber[]).length];
}

function zeros(shape: number[]): NestedNumber {
  if (shape.length === 0) return 0;
  if (shape.length === 1) return Array.from({ length: shape[0]! }, () => 0);
  return Array.from({ length: shape[0]! }, () => zeros(shape.slice(1)));
}

function ones(shape: number[]): NestedNumber {
  if (shape.length === 0) return 1;
  if (shape.length === 1) return Array.from({ length: shape[0]! }, () => 1);
  return Array.from({ length: shape[0]! }, () => ones(shape.slice(1)));
}

function full(shape: number[], fill: number): NestedNumber {
  if (shape.length === 0) return fill;
  if (shape.length === 1)
    return Array.from({ length: shape[0]! }, () => fill);
  return Array.from({ length: shape[0]! }, () => full(shape.slice(1), fill));
}

function mapDeep(
  a: NestedNumber,
  fn: (x: number) => number,
): NestedNumber {
  if (!Array.isArray(a)) return fn(a);
  return a.map((x) => mapDeep(x, fn));
}

function zipMap(
  a: NestedNumber,
  b: NestedNumber,
  fn: (x: number, y: number) => number,
): NestedNumber {
  if (!Array.isArray(a) && !Array.isArray(b)) return fn(a, b);
  if (!Array.isArray(a)) {
    return (b as NestedNumber[]).map((x) => zipMap(a, x, fn));
  }
  if (!Array.isArray(b)) {
    return a.map((x) => zipMap(x, b, fn));
  }
  if (a.length !== b.length) {
    throw new Error(`Shape mismatch: ${a.length} vs ${b.length}`);
  }
  return a.map((x, i) => zipMap(x, b[i]!, fn));
}

function reshape(flat: number[], newShape: number[]): NestedNumber {
  const size = newShape.reduce((p, c) => p * c, 1);
  if (flat.length !== size) {
    throw new Error(
      `Cannot reshape array of size ${flat.length} into shape [${newShape}]`,
    );
  }
  let offset = 0;
  function build(dims: number[]): NestedNumber {
    if (dims.length === 1) {
      const row = flat.slice(offset, offset + dims[0]!);
      offset += dims[0]!;
      return row;
    }
    return Array.from({ length: dims[0]! }, () => build(dims.slice(1)));
  }
  return build(newShape);
}

function transpose(a: NestedNumber): NestedNumber {
  const m = asMatrix(a);
  return toNested(m.transpose());
}

function concatenate(arrays: NestedNumber[], axis: number): NestedNumber {
  if (axis === 0) {
    return (arrays as NestedNumber[][]).flat();
  }
  // axis 1: concatenate along columns for 2D
  const mats = arrays.map((x) => asMatrix(x as NestedNumber));
  const rows = mats[0]!.rows;
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (const m of mats) {
      row.push(...m.getRow(r));
    }
    out.push(row);
  }
  return out;
}

function stack(arrays: NestedNumber[], axis: number): NestedNumber {
  if (axis === 0) {
    return arrays.map((a) => (Array.isArray(a) ? a : [a]));
  }
  // stack along axis 1 for 1D arrays → columns
  const cols = arrays.map((a) => flatten(a));
  const n = cols[0]!.length;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    out.push(cols.map((c) => c[i]!));
  }
  return out;
}

function percentile(values: number[], q: number): number {
  if (values.length === 0) throw new Error("empty array");
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (q / 100) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  const w = pos - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

function formatComplex(re: number, im: number): number | string {
  if (Math.abs(im) < 1e-12) return re;
  const sign = im >= 0 ? "+" : "-";
  return `${re}${sign}${Math.abs(im)}j`;
}

export interface NumericalArgs {
  operation: string;
  a?: NestedNumber | null;
  b?: NestedNumber | null;
  shape?: number[] | null;
  new_shape?: number[] | null;
  axis?: number;
  q?: number | null;
  start?: number | null;
  stop?: number | null;
  step?: number | null;
  num?: number | null;
  fill_value?: number | null;
}

export function numericalOperation(args: NumericalArgs): unknown {
  const {
    operation,
    a = null,
    b = null,
    shape = null,
    new_shape = null,
    axis = 0,
    q = null,
    start = null,
    stop = null,
    step = 1,
    num = null,
    fill_value = null,
  } = args;

  switch (operation) {
    case "create_array":
      return a;
    case "zeros":
      if (!shape) throw new Error("shape required for zeros");
      return zeros(shape);
    case "ones":
      if (!shape) throw new Error("shape required for ones");
      return ones(shape);
    case "full":
      if (!shape || fill_value == null)
        throw new Error("shape and fill_value required for full");
      return full(shape, fill_value);
    case "arange": {
      if (start == null || stop == null)
        throw new Error("start and stop required for arange");
      const s = step ?? 1;
      const out: number[] = [];
      for (let x = start; s > 0 ? x < stop : x > stop; x += s) out.push(x);
      return out;
    }
    case "linspace": {
      if (start == null || stop == null || num == null)
        throw new Error("start, stop, and num required for linspace");
      if (num === 1) return [start];
      const out: number[] = [];
      for (let i = 0; i < num; i++) {
        out.push(start + ((stop - start) * i) / (num - 1));
      }
      return out;
    }
    case "reshape":
      if (a == null || !new_shape)
        throw new Error("a and new_shape required for reshape");
      return reshape(flatten(a), new_shape);
    case "flatten":
      if (a == null) throw new Error("a required for flatten");
      return flatten(a);
    case "concatenate":
      if (a == null || !Array.isArray(a))
        throw new Error("a (list of arrays) required for concatenate");
      return concatenate(a as NestedNumber[], axis);
    case "transpose":
      if (a == null) throw new Error("a required for transpose");
      return transpose(a);
    case "stack":
      if (a == null || !Array.isArray(a))
        throw new Error("a (list of arrays) required for stack");
      return stack(a as NestedNumber[], axis);
    case "add":
      if (a == null || b == null) throw new Error("a and b required");
      return zipMap(a, b, (x, y) => x + y);
    case "subtract":
      if (a == null || b == null) throw new Error("a and b required");
      return zipMap(a, b, (x, y) => x - y);
    case "multiply":
      if (a == null || b == null) throw new Error("a and b required");
      return zipMap(a, b, (x, y) => x * y);
    case "divide":
      if (a == null || b == null) throw new Error("a and b required");
      return zipMap(a, b, (x, y) => x / y);
    case "power":
      if (a == null || b == null) throw new Error("a and b required");
      return zipMap(a, b, (x, y) => x ** y);
    case "abs_val":
      if (a == null) throw new Error("a required");
      return mapDeep(a, Math.abs);
    case "exp":
      if (a == null) throw new Error("a required");
      return mapDeep(a, Math.exp);
    case "log":
      if (a == null) throw new Error("a required");
      return mapDeep(a, Math.log);
    case "sqrt":
      if (a == null) throw new Error("a required");
      return mapDeep(a, Math.sqrt);
    case "sin":
      if (a == null) throw new Error("a required");
      return mapDeep(a, Math.sin);
    case "cos":
      if (a == null) throw new Error("a required");
      return mapDeep(a, Math.cos);
    case "tan":
      if (a == null) throw new Error("a required");
      return mapDeep(a, Math.tan);
    case "mean": {
      if (a == null) throw new Error("a required");
      const v = flatten(a);
      return v.reduce((s, x) => s + x, 0) / v.length;
    }
    case "median": {
      if (a == null) throw new Error("a required");
      const v = [...flatten(a)].sort((x, y) => x - y);
      const mid = Math.floor(v.length / 2);
      return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
    }
    case "std": {
      if (a == null) throw new Error("a required");
      const v = flatten(a);
      const mean = v.reduce((s, x) => s + x, 0) / v.length;
      const variance =
        v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length;
      return Math.sqrt(variance);
    }
    case "var": {
      if (a == null) throw new Error("a required");
      const v = flatten(a);
      const mean = v.reduce((s, x) => s + x, 0) / v.length;
      return v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length;
    }
    case "min_val":
      if (a == null) throw new Error("a required");
      return Math.min(...flatten(a));
    case "max_val":
      if (a == null) throw new Error("a required");
      return Math.max(...flatten(a));
    case "argmin": {
      if (a == null) throw new Error("a required");
      const v = flatten(a);
      let idx = 0;
      for (let i = 1; i < v.length; i++) if (v[i]! < v[idx]!) idx = i;
      return idx;
    }
    case "argmax": {
      if (a == null) throw new Error("a required");
      const v = flatten(a);
      let idx = 0;
      for (let i = 1; i < v.length; i++) if (v[i]! > v[idx]!) idx = i;
      return idx;
    }
    case "percentile":
      if (a == null || q == null)
        throw new Error("a and q required for percentile");
      return percentile(flatten(a), q);
    case "dot": {
      if (a == null || b == null) throw new Error("a and b required");
      const va = flatten(a);
      const vb = flatten(b);
      if (va.length !== vb.length)
        throw new Error("dot product length mismatch");
      return va.reduce((s, x, i) => s + x * vb[i]!, 0);
    }
    case "matmul": {
      if (a == null || b == null) throw new Error("a and b required");
      return toNested(asMatrix(a).mmul(asMatrix(b)));
    }
    case "inv": {
      if (a == null) throw new Error("a required");
      return toNested(inverse(asMatrix(a)));
    }
    case "det": {
      if (a == null) throw new Error("a required");
      return determinant(asMatrix(a));
    }
    case "eig": {
      if (a == null) throw new Error("a required");
      const evd = new EigenvalueDecomposition(asMatrix(a));
      const real = evd.realEigenvalues;
      const imag = evd.imaginaryEigenvalues;
      const eigenvalues = real.map((re, i) => formatComplex(re, imag[i]!));
      const eigenvectors = evd.eigenvectorMatrix.to2DArray().map((row) =>
        row.map((v) => v),
      );
      return { eigenvalues, eigenvectors };
    }
    case "eigenvals": {
      if (a == null) throw new Error("a required");
      const evd = new EigenvalueDecomposition(asMatrix(a));
      return evd.realEigenvalues.map((re, i) =>
        formatComplex(re, evd.imaginaryEigenvalues[i]!),
      );
    }
    case "solve": {
      if (a == null || b == null) throw new Error("a and b required");
      const B = asMatrix(b);
      const solved = mlSolve(asMatrix(a), B.columns === 1 ? B : B.transpose());
      return toNested(solved);
    }
    case "svd": {
      if (a == null) throw new Error("a required");
      const svd = new SingularValueDecomposition(asMatrix(a), {
        autoTranspose: true,
      });
      return {
        U: svd.leftSingularVectors.to2DArray(),
        S: svd.diagonal,
        Vt: svd.rightSingularVectors.transpose().to2DArray(),
      };
    }
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// silence unused helper warning while keeping for debugging
void shapeOf;
