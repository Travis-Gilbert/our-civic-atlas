declare module "@uwdata/vgplot" {
  type PlotOption = unknown;
  type PlotMark = unknown;

  export type Coordinator = {
    databaseConnector(connector: unknown): unknown;
  };
  export type SelectionHandle = {
    clauses?: unknown[];
    addEventListener(
      type: string,
      listener: () => void,
    ): (() => void) | void;
  };

  export const Selection: {
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
  export function intervalX(options?: Record<string, unknown>): PlotOption;
  export function xLabel(label: string): PlotOption;
  export function yLabel(label: string): PlotOption;
  export function width(value: number): PlotOption;
  export function height(value: number): PlotOption;
  export function marginLeft(value: number): PlotOption;
  export function marginBottom(value: number): PlotOption;
  export function marginRight(value: number): PlotOption;
  export function marginTop(value: number): PlotOption;
  export function style(value: Record<string, unknown>): PlotOption;
}
