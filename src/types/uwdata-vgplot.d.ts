declare module "@uwdata/vgplot" {
  type PlotOption = unknown;
  type PlotMark = unknown;
  type SelectionClause = {
    source?: unknown;
    value?: unknown;
    predicate?: unknown;
  };

  export type Coordinator = {
    databaseConnector(connector: unknown): unknown;
  };
  export type SelectionHandle = {
    clauses?: unknown[];
    update(clause: SelectionClause): SelectionHandle;
    valueFor(source: unknown): unknown;
    addEventListener(
      type: string,
      listener: () => void,
    ): (() => void) | void;
  };

  export const Selection: {
    intersect(options?: {
      cross?: boolean;
      empty?: boolean;
      include?: SelectionHandle | SelectionHandle[];
    }): SelectionHandle;
    crossfilter(): SelectionHandle;
    single(): SelectionHandle;
  };

  export function coordinator(): Coordinator;
  export function wasmConnector(options: Record<string, unknown>): unknown;
  export function plot(...options: PlotOption[]): Promise<HTMLElement>;
  export function rectY(data: unknown, options?: Record<string, unknown>): PlotMark;
  export function from(
    table: string,
    options?: Record<string, unknown>,
  ): unknown;
  export function bin(field: string): unknown;
  export function count(): unknown;
  export function avg(field: string): unknown;
  export function literal(value: unknown): unknown;
  export function eq(field: unknown, value: unknown): unknown;
  export function intervalX(options?: Record<string, unknown>): PlotOption;
  export function toggleX(options?: Record<string, unknown>): PlotOption;
  export function xLabel(label: string): PlotOption;
  export function yLabel(label: string): PlotOption;
  export function width(value: number): PlotOption;
  export function height(value: number): PlotOption;
  export function marginLeft(value: number): PlotOption;
  export function marginBottom(value: number): PlotOption;
  export function marginRight(value: number): PlotOption;
  export function marginTop(value: number): PlotOption;
  export function style(value: Record<string, unknown>): PlotOption;
  export function lineY(data: unknown, options?: Record<string, unknown>): PlotMark;
  export function areaY(data: unknown, options?: Record<string, unknown>): PlotMark;
  export function dot(data: unknown, options?: Record<string, unknown>): PlotMark;
}
