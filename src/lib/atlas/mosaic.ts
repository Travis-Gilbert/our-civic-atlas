/**
 * Mosaic + DuckDB-WASM initialization for the Open Flint Atlas.
 *
 * Sets up a single Coordinator process-wide, backed by an in-browser
 * DuckDB-WASM instance. The atlas uses Mosaic for cross-filter
 * coordination: a vgplot timeline histogram publishes its brush range
 * into a Selection, and any consumer that reads from a Mosaic-bound
 * table sees the filtered slice automatically.
 *
 * Why DuckDB-WASM and not just JS array filters?
 *   1. Mosaic's Selection model is designed around predicate clauses
 *      that lower to SQL — keeping the data in DuckDB is the path of
 *      least resistance.
 *   2. Atlas-scale data can grow into thousands of events + tens of
 *      thousands of place features; DuckDB's columnar engine stays
 *      snappy in the browser well past the point where Array.filter
 *      gets ragged.
 *   3. Cross-table brushing (time range + ward filter + event type
 *      facet) composes via SQL predicates instead of nested filter
 *      callbacks.
 *
 * SSR safety: this module touches Worker/WASM at first call, so the
 * caller must invoke it from the browser (e.g. inside a ``useEffect``
 * or a ``'use client'`` component).
 */

import * as duckdb from "@duckdb/duckdb-wasm";
import * as vg from "@uwdata/vgplot";

let _instance: Promise<AtlasMosaic> | null = null;

export interface AtlasMosaic {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
  coordinator: ReturnType<typeof vg.coordinator>;
  /** Crossfilter selection for the timeline brush. Plot consumers
      that wire ``filterBy: timeFilter`` see the brushed slice. */
  timeFilter: ReturnType<typeof vg.Selection.crossfilter>;
  /** Tracks the currently-selected place_id for highlighting. */
  placeFilter: ReturnType<typeof vg.Selection.single>;
}

async function _initMosaic(): Promise<AtlasMosaic> {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);

  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    }),
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker ?? undefined);
  URL.revokeObjectURL(workerUrl);

  const conn = await db.connect();
  // @uwdata/vgplot ships its own coordinator + connector wiring.
  vg.coordinator().databaseConnector(vg.wasmConnector({ duckdb: db, connection: conn }));

  const timeFilter = vg.Selection.crossfilter();
  const placeFilter = vg.Selection.single();

  return {
    db,
    conn,
    coordinator: vg.coordinator(),
    timeFilter,
    placeFilter,
  };
}

/**
 * Lazy singleton accessor. Multiple components requesting the same
 * Coordinator share one DuckDB instance for the page lifetime.
 */
export function getAtlasMosaic(): Promise<AtlasMosaic> {
  if (!_instance) {
    _instance = _initMosaic().catch((err) => {
      _instance = null; // allow retry on next call
      throw err;
    });
  }
  return _instance;
}

/** Reset the singleton — useful in tests or HMR scenarios. */
export function resetAtlasMosaic(): void {
  _instance = null;
}
