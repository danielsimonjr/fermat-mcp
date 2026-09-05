import { renderChart, DEFAULT_COLORS } from "./svg.ts";

export function plotBarchart(args: {
  values: number[];
  labels?: string[] | null;
  title?: string;
  xlabel?: string;
  ylabel?: string;
  color?: string;
  orientation?: "vertical" | "horizontal";
}): string {
  const {
    values,
    labels = null,
    title = "",
    xlabel = "",
    ylabel = "",
    color = "skyblue",
    orientation = "vertical",
  } = args;

  const x = values.map((_, i) => i);
  const cats = labels ?? values.map(() => "");

  if (orientation === "horizontal") {
    // Swap: categorical on y via index, values as x — approximate with bar chart.
    return renderChart(
      [
        {
          x: values,
          y: x,
          kind: "bar",
          color,
          label: title || "values",
        },
      ],
      { title, xlabel, ylabel, legend: false },
    );
  }

  return renderChart(
    [{ x, y: values, kind: "bar", color, label: cats.join(",") || undefined }],
    { title, xlabel, ylabel, legend: false },
  );
}

export function plotScatter(args: {
  x_data: number[];
  y_data: number[];
  labels?: string | string[] | null;
  title?: string;
  xlabel?: string;
  ylabel?: string;
  color?: string | string[];
  grid?: boolean;
  legend?: boolean;
}): string {
  const {
    x_data,
    y_data,
    labels = null,
    title = "",
    xlabel = "",
    ylabel = "",
    color = "blue",
    grid = true,
    legend = false,
  } = args;

  const label = Array.isArray(labels) ? labels[0] : labels;
  const c = Array.isArray(color) ? color[0] : color;

  return renderChart(
    [{ x: x_data, y: y_data, kind: "scatter", color: c, label: label ?? undefined }],
    { title, xlabel, ylabel, grid, legend },
  );
}

export function plotChart(args: {
  x_data: number[];
  y_data: number[] | number[][];
  plot_type?: "line" | "scatter" | "bar";
  labels?: string | string[] | null;
  title?: string;
  xlabel?: string;
  ylabel?: string;
  color?: string | string[];
  grid?: boolean;
  legend?: boolean;
}): string {
  const {
    x_data,
    y_data,
    plot_type = "line",
    labels = null,
    title = "",
    xlabel = "",
    ylabel = "",
    color = "skyblue",
    grid = true,
    legend = false,
  } = args;

  const seriesY: number[][] = Array.isArray(y_data[0])
    ? (y_data as number[][])
    : [y_data as number[]];

  // If y is column-oriented (rows = points), detect by length match
  let columns: number[][];
  if (seriesY.length === x_data.length && Array.isArray(seriesY[0])) {
    // rows of points → transpose to columns
    const cols = seriesY[0]!.length;
    columns = Array.from({ length: cols }, (_, c) =>
      seriesY.map((row) => row[c]!),
    );
  } else if (
    seriesY.length === 1 ||
    (seriesY[0] && seriesY[0].length === x_data.length)
  ) {
    columns = seriesY;
  } else {
    // treat as columns already
    columns = seriesY;
  }

  const labelList = Array.isArray(labels)
    ? labels
    : labels
      ? [labels]
      : columns.map((_, i) => `Series ${i + 1}`);
  const colorList = Array.isArray(color)
    ? color
    : columns.map((_, i) => color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]!);

  const series = columns.map((y, i) => ({
    x: x_data,
    y,
    kind: plot_type as "line" | "scatter" | "bar",
    label: labelList[i],
    color: colorList[i % colorList.length],
  }));

  return renderChart(series, { title, xlabel, ylabel, grid, legend });
}

export function plotStem(args: {
  x_data: number[];
  y_data: number[] | number[][];
  labels?: string | string[] | null;
  title?: string;
  xlabel?: string;
  ylabel?: string;
  colors?: string | string[];
  grid?: boolean;
  legend?: boolean;
}): string {
  const {
    x_data,
    y_data,
    labels = null,
    title = "",
    xlabel = "",
    ylabel = "",
    colors = "blue",
    grid = true,
    legend = false,
  } = args;

  const columns: number[][] = Array.isArray(y_data[0])
    ? (y_data as number[][]).length === x_data.length
      ? (() => {
          const cols = (y_data as number[][])[0]!.length;
          return Array.from({ length: cols }, (_, c) =>
            (y_data as number[][]).map((row) => row[c]!),
          );
        })()
      : (y_data as number[][])
    : [y_data as number[]];

  const labelList = Array.isArray(labels)
    ? labels
    : labels
      ? [labels]
      : columns.map((_, i) => `Series ${i + 1}`);
  const colorList = Array.isArray(colors) ? colors : [colors];

  return renderChart(
    columns.map((y, i) => ({
      x: x_data,
      y,
      kind: "stem" as const,
      label: labelList[i],
      color: colorList[i % colorList.length],
    })),
    { title, xlabel, ylabel, grid, legend },
  );
}

export function plotStack(args: {
  x_data: number[];
  y_data: number[] | number[][];
  chart_type?: "area" | "bar";
  labels?: string[] | null;
  title?: string;
  xlabel?: string;
  ylabel?: string;
  colors?: string | string[] | null;
  grid?: boolean;
  legend?: boolean;
}): string {
  const {
    x_data,
    y_data,
    chart_type = "area",
    labels = null,
    title = "",
    xlabel = "",
    ylabel = "",
    colors = null,
    grid = true,
    legend = true,
  } = args;

  let rows: number[][];
  if (!Array.isArray(y_data[0])) {
    rows = [y_data as number[]];
  } else {
    rows = y_data as number[][];
  }

  const labelList =
    labels ?? rows.map((_, i) => `Series ${i + 1}`);
  const colorList = Array.isArray(colors)
    ? colors
    : colors
      ? [colors]
      : DEFAULT_COLORS;

  const baseline = new Array(x_data.length).fill(0) as number[];
  const series = rows.map((y, i) => {
    const stackedWith = [...baseline];
    for (let j = 0; j < y.length; j++) {
      baseline[j] = (baseline[j] ?? 0) + (y[j] ?? 0);
    }
    return {
      x: x_data,
      y,
      kind: (chart_type === "bar" ? "bar" : "area") as "bar" | "area",
      label: labelList[i],
      color: colorList[i % colorList.length],
      stackedWith,
    };
  });

  return renderChart(series, { title, xlabel, ylabel, grid, legend });
}
