#!/usr/bin/env node

const DEFAULT_BASE_URL =
  process.env.ATLAS_BASE_URL?.trim() || "http://127.0.0.1:3000";

const ROUTES = [
  { path: "/open-flint-atlas", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/explore", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/memory", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/safety", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/interventions", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/evidence", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/sources", expect: "Sources" },
  { path: "/open-flint-atlas/contribute", expect: "Contribute" },
  { path: "/open-flint-atlas/methodology", expect: "Methodology" },
  { path: "/open-flint-atlas/node/atlas%3Aflint-mi", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/place/ward%3A1", expect: "Ward 1" },
  {
    path: "/open-flint-atlas/object/dataset%3Aflint-read-model-v0",
    expect: "Flint Atlas public read model v0",
  },
  {
    path: "/open-flint-atlas/scene/scene%3Aflint-overview",
    expect: "Flint overview scene",
  },
];

const API_ROUTES = [
  {
    path: "/api/v2/theseus/open-flint-atlas/scene-manifests/",
    expectKey: "scene_manifests",
  },
  {
    path: "/api/v2/theseus/open-flint-atlas/scenario-manifests/",
    expectKey: "scenario_manifests",
  },
  {
    path: "/api/v2/theseus/open-flint-atlas/primitive-library/",
    expectKey: "primitives",
  },
  {
    path: "/api/v2/theseus/open-flint-atlas/geo-comments/",
    expectKey: "comments",
  },
  {
    path: "/api/v2/theseus/open-flint-atlas/layer-recipes/",
    expectKey: "layer_recipes",
  },
  {
    path: "/api/v2/theseus/open-flint-atlas/renderer-boundaries/",
    expectKey: "renderer_boundaries",
  },
];

const CATALOG_ROUTE_EXPECTATIONS = [
  {
    id: "scene-manifests",
    url: "/api/v2/theseus/open-flint-atlas/scene-manifests/",
  },
  {
    id: "scenario-manifests",
    url: "/api/v2/theseus/open-flint-atlas/scenario-manifests/",
  },
  {
    id: "primitive-library",
    url: "/api/v2/theseus/open-flint-atlas/primitive-library/",
  },
  {
    id: "geo-comments",
    url: "/api/v2/theseus/open-flint-atlas/geo-comments/",
  },
  {
    id: "layer-recipes",
    url: "/api/v2/theseus/open-flint-atlas/layer-recipes/",
  },
];

function parseOptions(argv) {
  const options = { baseUrl: DEFAULT_BASE_URL };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      const value = argv[index + 1];
      if (!value) throw new Error("--base-url requires a value");
      options.baseUrl = value;
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function routeUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function smokeRoute(baseUrl, route) {
  const response = await fetch(routeUrl(baseUrl, route.path));
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`${route.path} returned ${response.status}`);
  }
  const text = await response.text();
  if (!text.includes(route.expect)) {
    throw new Error(`${route.path} did not include expected text: ${route.expect}`);
  }
}

async function smokeApiRoute(baseUrl, route) {
  const response = await fetch(routeUrl(baseUrl, route.path));
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`${route.path} returned ${response.status}`);
  }
  const payload = await response.json();
  if (!(route.expectKey in payload)) {
    throw new Error(`${route.path} did not include expected key: ${route.expectKey}`);
  }
}

async function smokeReadModelCatalog(baseUrl) {
  const response = await fetch(
    routeUrl(baseUrl, "/api/v2/theseus/open-flint-atlas/read-model-catalog"),
  );
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`/api/v2/theseus/open-flint-atlas/read-model-catalog returned ${response.status}`);
  }

  const payload = await response.json();
  const files = Array.isArray(payload.files) ? payload.files : [];

  for (const expectation of CATALOG_ROUTE_EXPECTATIONS) {
    const entry = files.find((file) => file?.id === expectation.id);
    if (!entry) {
      throw new Error(`read-model-catalog is missing ${expectation.id}`);
    }
    if (entry.url !== expectation.url) {
      throw new Error(
        `read-model-catalog ${expectation.id} url mismatch: expected ${expectation.url}, received ${entry.url}`,
      );
    }

    const entryResponse = await fetch(routeUrl(baseUrl, entry.url));
    if (entryResponse.status < 200 || entryResponse.status >= 400) {
      throw new Error(`${entry.url} returned ${entryResponse.status}`);
    }
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  let passed = 0;
  for (const route of ROUTES) {
    await smokeRoute(options.baseUrl, route);
    passed += 1;
  }
  for (const route of API_ROUTES) {
    await smokeApiRoute(options.baseUrl, route);
    passed += 1;
  }
  await smokeReadModelCatalog(options.baseUrl);
  passed += CATALOG_ROUTE_EXPECTATIONS.length + 1;
  console.log(`Open Flint route smoke complete: ${passed}/${ROUTES.length + API_ROUTES.length + CATALOG_ROUTE_EXPECTATIONS.length + 1} checks passed.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
