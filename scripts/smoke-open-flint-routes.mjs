#!/usr/bin/env node

const DEFAULT_BASE_URL = "http://localhost:3000";

const ROUTES = [
  { path: "/open-flint-atlas", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/explore", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/memory", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/safety", expect: "Flint Atlas" },
  { path: "/open-flint-atlas/interventions", expect: "Flint Atlas" },
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
  const response = await fetch(routeUrl(baseUrl, route.path), {
    redirect: "manual",
  });
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`${route.path} returned ${response.status}`);
  }
  const text = await response.text();
  if (!text.includes(route.expect)) {
    throw new Error(`${route.path} did not include expected text: ${route.expect}`);
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  let passed = 0;
  for (const route of ROUTES) {
    await smokeRoute(options.baseUrl, route);
    passed += 1;
  }
  console.log(`Open Flint route smoke complete: ${passed}/${ROUTES.length} routes passed.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
