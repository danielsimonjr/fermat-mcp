declare module "nerdamer" {
  interface Expression {
    text(format?: string): string;
    toString(): string;
    expand(): Expression;
    evaluate(vars?: Record<string, unknown>): Expression;
  }

  interface NerdamerStatic {
    (expr: string | Expression, vars?: Record<string, unknown>): Expression;
    factor(expr: string | Expression): Expression;
    diff(expr: string | Expression, variable: string): Expression;
    integrate(expr: string | Expression, variable: string): Expression;
    limit(
      expr: string | Expression,
      variable: string,
      point: string | number,
    ): Expression;
    solve(expr: string | Expression, variable: string): Expression;
    solveEquations(equations: string[]): Array<string | number>;
    factorial(n: number): Expression;
  }

  const nerdamer: NerdamerStatic;
  export default nerdamer;
}

declare module "nerdamer/Algebra.js" {}
declare module "nerdamer/Calculus.js" {}
declare module "nerdamer/Solve.js" {}
