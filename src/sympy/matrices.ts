import nerdamer from "nerdamer";
import "nerdamer/Algebra.js";
import {
  Matrix,
  EigenvalueDecomposition,
  inverse,
  determinant,
} from "ml-matrix";
import { assertSafeExpr, normalizeExpr } from "./safe-parse.ts";

export type MatrixOp = "create" | "det" | "inv" | "rref" | "eigenvals";

export interface MatrixArgs {
  operation: MatrixOp;
  data: string | (string | number)[] | (string | number)[][];
  rational?: boolean;
  nrows?: number | null;
  ncols?: number | null;
  simplify?: boolean;
}

function parseCell(cell: string | number): number | string {
  if (typeof cell === "number") return cell;
  assertSafeExpr(cell);
  const e = normalizeExpr(cell);
  try {
    const n = Number(nerdamer(e).evaluate().text());
    if (Number.isFinite(n)) return n;
  } catch {
    /* keep symbolic string */
  }
  return e;
}

function parseMatrixData(
  data: MatrixArgs["data"],
): (number | string)[][] {
  if (typeof data === "string") {
    assertSafeExpr(data);
    if (data.includes(";")) {
      return data
        .split(";")
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => row.split(/\s+/).map(parseCell));
    }
    // Try JSON-ish list of lists
    try {
      const parsed = JSON.parse(data) as unknown;
      if (Array.isArray(parsed)) {
        if (parsed.every((r) => Array.isArray(r))) {
          return (parsed as (string | number)[][]).map((row) =>
            row.map(parseCell),
          );
        }
        return [parsed.map((x) => parseCell(x as string | number))];
      }
    } catch {
      /* fall through */
    }
    return data
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => row.split(/\s+/).map(parseCell));
  }

  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    return (data as (string | number)[][]).map((row) => row.map(parseCell));
  }
  return [(data as (string | number)[]).map(parseCell)];
}

function toNumeric(matrix: (number | string)[][]): number[][] {
  return matrix.map((row) =>
    row.map((cell) => {
      if (typeof cell === "number") return cell;
      const n = Number(nerdamer(cell).evaluate().text());
      if (!Number.isFinite(n)) {
        throw new Error(`Cannot numerically evaluate cell: ${cell}`);
      }
      return n;
    }),
  );
}

function rref(matrix: number[][]): { rref: number[][]; pivots: number[] } {
  const A = matrix.map((row) => [...row]);
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let pivot = r;
    for (let i = r + 1; i < rows; i++) {
      if (Math.abs(A[i]![c]!) > Math.abs(A[pivot]![c]!)) pivot = i;
    }
    if (Math.abs(A[pivot]![c]!) < 1e-12) continue;
    [A[r], A[pivot]] = [A[pivot]!, A[r]!];
    const div = A[r]![c]!;
    for (let j = 0; j < cols; j++) A[r]![j]! /= div;
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const factor = A[i]![c]!;
      for (let j = 0; j < cols; j++) A[i]![j]! -= factor * A[r]![j]!;
    }
    pivots.push(c);
    r++;
  }
  // Clean near-zeros
  for (const row of A) {
    for (let j = 0; j < cols; j++) {
      if (Math.abs(row[j]!) < 1e-10) row[j] = 0;
    }
  }
  return { rref: A, pivots };
}

function formatEigen(re: number, im: number): string {
  if (Math.abs(im) < 1e-10) {
    return `${re}`.replace(/\.?0+$/, "");
  }
  const sign = im >= 0 ? " + " : " - ";
  return `${re}${sign}${Math.abs(im)}j`;
}

export function matrixOperation(args: MatrixArgs): unknown {
  const { operation, data, nrows = null, ncols = null } = args;
  let matrix = parseMatrixData(data);

  if (nrows != null || ncols != null) {
    const flat = matrix.flat();
    const cols =
      ncols ??
      (nrows != null ? Math.ceil(flat.length / nrows) : matrix[0]!.length);
    const rows = nrows ?? Math.ceil(flat.length / cols);
    const reshaped: (number | string)[][] = [];
    for (let i = 0; i < rows; i++) {
      reshaped.push(flat.slice(i * cols, (i + 1) * cols));
    }
    matrix = reshaped;
  }

  if (operation === "create") {
    return matrix;
  }

  const numeric = toNumeric(matrix);
  if (
    (operation === "det" ||
      operation === "inv" ||
      operation === "eigenvals") &&
    numeric.length !== (numeric[0]?.length ?? 0)
  ) {
    throw new Error(`Matrix must be square for ${operation} operation`);
  }

  const M = new Matrix(numeric);

  switch (operation) {
    case "det":
      return determinant(M);
    case "inv":
      try {
        return inverse(M).to2DArray();
      } catch {
        throw new Error("Matrix is not invertible (determinant is zero)");
      }
    case "rref": {
      const result = rref(numeric);
      return [result.rref, result.pivots];
    }
    case "eigenvals": {
      const evd = new EigenvalueDecomposition(M);
      const out: Record<string, number> = {};
      for (let i = 0; i < evd.realEigenvalues.length; i++) {
        const key = formatEigen(
          evd.realEigenvalues[i]!,
          evd.imaginaryEigenvalues[i]!,
        );
        out[key] = (out[key] ?? 0) + 1;
      }
      return out;
    }
    default:
      throw new Error(`Invalid operation: ${operation}`);
  }
}
