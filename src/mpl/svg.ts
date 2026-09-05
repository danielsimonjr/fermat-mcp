/** Lightweight SVG chart renderer — no native canvas dependency. */

export interface ChartOptions {
  title?: string;
  xlabel?: string;
  ylabel?: string;
  width?: number;
  height?: number;
  grid?: boolean;
  legend?: boolean;
  padding?: { top: number; right: number; bottom: number; left: number };
}

export interface Series {
  x: number[];
  y: number[];
  label?: string;
  color?: string;
  kind?: "line" | "scatter" | "bar" | "stem" | "area";
  stackedWith?: number[]; // cumulative baseline for area/bar stacks
}

const DEFAULT_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range || 1));
  const frac = range / 10 ** exp;
  let nice: number;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }
  return nice * 10 ** exp;
}

function ticks(min: number, max: number, count = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min || 0];
  }
  const range = niceNum(max - min, false);
  const step = niceNum(range / (count - 1), true);
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) out.push(v);
  return out;
}

export function renderChart(series: Series[], opts: ChartOptions = {}): string {
  const width = opts.width ?? 720;
  const height = opts.height ?? 420;
  const pad = opts.padding ?? { top: 48, right: 24, bottom: 56, left: 64 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allX = series.flatMap((s) => s.x).filter(Number.isFinite);
  const allY = series
    .flatMap((s) => {
      if (s.stackedWith) {
        return s.y.map((y, i) => y + (s.stackedWith![i] ?? 0));
      }
      return s.y;
    })
    .filter(Number.isFinite);

  let xMin = Math.min(...allX);
  let xMax = Math.max(...allX);
  let yMin = Math.min(0, ...allY);
  let yMax = Math.max(...allY);
  if (xMin === xMax) {
    xMin -= 1;
    xMax += 1;
  }
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  // padding
  const xPad = (xMax - xMin) * 0.02;
  const yPad = (yMax - yMin) * 0.05;
  xMin -= xPad;
  xMax += xPad;
  yMin -= yPad;
  yMax += yPad;

  const sx = (x: number) => pad.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y: number) => pad.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  parts.push(`<rect width="100%" height="100%" fill="#fafafa"/>`);
  parts.push(
    `<rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="#ffffff" stroke="#e5e7eb"/>`,
  );

  if (opts.grid !== false) {
    for (const t of ticks(xMin, xMax)) {
      const x = sx(t);
      parts.push(
        `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + plotH}" stroke="#e5e7eb" stroke-dasharray="4 4"/>`,
      );
    }
    for (const t of ticks(yMin, yMax)) {
      const y = sy(t);
      parts.push(
        `<line x1="${pad.left}" y1="${y}" x2="${pad.left + plotW}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="4 4"/>`,
      );
    }
  }

  // Axes ticks labels
  for (const t of ticks(xMin, xMax)) {
    const x = sx(t);
    parts.push(
      `<text x="${x}" y="${pad.top + plotH + 18}" text-anchor="middle" font-size="11" fill="#4b5563" font-family="ui-sans-serif,system-ui">${esc(formatTick(t))}</text>`,
    );
  }
  for (const t of ticks(yMin, yMax)) {
    const y = sy(t);
    parts.push(
      `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#4b5563" font-family="ui-sans-serif,system-ui">${esc(formatTick(t))}</text>`,
    );
  }

  series.forEach((s, idx) => {
    const color = s.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]!;
    const kind = s.kind ?? "line";
    if (kind === "line" || kind === "area") {
      const pts = s.x
        .map((x, i) => {
          const y = s.y[i]!;
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          const baseline = s.stackedWith?.[i] ?? 0;
          return `${sx(x)},${sy(y + baseline)}`;
        })
        .filter(Boolean)
        .join(" ");
      if (kind === "area" && s.stackedWith) {
        const top = s.x
          .map((x, i) => `${sx(x)},${sy(s.y[i]! + s.stackedWith![i]!)}`)
          .join(" ");
        const bottom = [...s.x]
          .reverse()
          .map((x, ri) => {
            const i = s.x.length - 1 - ri;
            return `${sx(x)},${sy(s.stackedWith![i]!)}`;
          })
          .join(" ");
        parts.push(
          `<polygon points="${top} ${bottom}" fill="${color}" fill-opacity="0.45" stroke="none"/>`,
        );
      }
      parts.push(
        `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>`,
      );
    } else if (kind === "scatter") {
      s.x.forEach((x, i) => {
        const y = s.y[i]!;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        parts.push(
          `<circle cx="${sx(x)}" cy="${sy(y)}" r="4" fill="${color}" fill-opacity="0.8"/>`,
        );
      });
    } else if (kind === "bar") {
      const barW = Math.max(4, (plotW / Math.max(s.x.length, 1)) * 0.6);
      s.x.forEach((x, i) => {
        const y = s.y[i]!;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const baseline = s.stackedWith?.[i] ?? 0;
        const y0 = sy(baseline);
        const y1 = sy(y + baseline);
        const top = Math.min(y0, y1);
        const h = Math.abs(y1 - y0);
        parts.push(
          `<rect x="${sx(x) - barW / 2}" y="${top}" width="${barW}" height="${h}" fill="${color}" fill-opacity="0.85"/>`,
        );
      });
    } else if (kind === "stem") {
      s.x.forEach((x, i) => {
        const y = s.y[i]!;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        parts.push(
          `<line x1="${sx(x)}" y1="${sy(0)}" x2="${sx(x)}" y2="${sy(y)}" stroke="${color}" stroke-width="1.5"/>`,
        );
        parts.push(
          `<circle cx="${sx(x)}" cy="${sy(y)}" r="3.5" fill="${color}"/>`,
        );
      });
    }
  });

  if (opts.title) {
    parts.push(
      `<text x="${width / 2}" y="28" text-anchor="middle" font-size="16" font-weight="600" fill="#111827" font-family="ui-sans-serif,system-ui">${esc(opts.title)}</text>`,
    );
  }
  if (opts.xlabel) {
    parts.push(
      `<text x="${pad.left + plotW / 2}" y="${height - 12}" text-anchor="middle" font-size="12" fill="#374151" font-family="ui-sans-serif,system-ui">${esc(opts.xlabel)}</text>`,
    );
  }
  if (opts.ylabel) {
    parts.push(
      `<text x="16" y="${pad.top + plotH / 2}" text-anchor="middle" font-size="12" fill="#374151" font-family="ui-sans-serif,system-ui" transform="rotate(-90 16 ${pad.top + plotH / 2})">${esc(opts.ylabel)}</text>`,
    );
  }

  if (opts.legend && series.some((s) => s.label)) {
    let lx = pad.left + 8;
    const ly = pad.top + 14;
    series.forEach((s, idx) => {
      if (!s.label) return;
      const color = s.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]!;
      parts.push(
        `<rect x="${lx}" y="${ly - 8}" width="10" height="10" fill="${color}"/>`,
      );
      parts.push(
        `<text x="${lx + 14}" y="${ly}" font-size="11" fill="#374151" font-family="ui-sans-serif,system-ui">${esc(s.label)}</text>`,
      );
      lx += 14 + s.label.length * 7 + 16;
    });
  }

  parts.push(`</svg>`);
  return parts.join("");
}

function formatTick(n: number): string {
  if (Math.abs(n) >= 1000 || (Math.abs(n) > 0 && Math.abs(n) < 0.01)) {
    return n.toExponential(1);
  }
  return Number(n.toPrecision(4)).toString();
}

export { DEFAULT_COLORS };
