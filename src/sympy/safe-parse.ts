/**
 * Safe expression parsing for symbolic tools.
 * Rejects dunder access and routes through nerdamer (no eval builtins).
 */

const DUNDER = /__/;

/** Reject obviously dangerous tokens before handing to the CAS. */
export function assertSafeExpr(expr: string): void {
  if (DUNDER.test(expr)) {
    throw new Error(`disallowed expression (contains '__'): ${expr}`);
  }
  // Block common escape hatches that CAS string parsers sometimes accept.
  if (/\b(import|require|process|globalThis|Function|eval)\b/.test(expr)) {
    throw new Error(`disallowed expression: ${expr}`);
  }
}

export function normalizeExpr(expr: string): string {
  assertSafeExpr(expr);
  // Prefer ** for powers in user input; nerdamer wants ^.
  return expr.replace(/\*\*/g, "^");
}
