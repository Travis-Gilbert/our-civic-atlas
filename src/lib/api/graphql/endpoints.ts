const PUBLIC_ATLAS_GRAPHQL_ENDPOINT =
  "https://our-civic-atlas-backend-production.up.railway.app/graphql";

const LOCAL_ATLAS_GRAPHQL_ENDPOINT = "http://127.0.0.1:4001/graphql";

function isGclbaTarget(): boolean {
  return (
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_DEPLOYMENT_TARGET === "gclba" ||
    process.env.CIVIC_ATLAS_DEPLOYMENT_TARGET === "gclba"
  );
}

function isLocalBrowserHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

export function resolveServerGraphqlEndpoint(): string {
  if (isGclbaTarget()) {
    return (
      process.env.GCLBA_GRAPHQL_URL ??
      process.env.NEXT_PUBLIC_GCLBA_GRAPHQL_URL ??
      process.env.CIVIC_ATLAS_GRAPHQL_URL ??
      process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL ??
      PUBLIC_ATLAS_GRAPHQL_ENDPOINT
    );
  }

  return (
    process.env.CIVIC_ATLAS_GRAPHQL_URL ??
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL ??
    PUBLIC_ATLAS_GRAPHQL_ENDPOINT
  );
}

export function resolveBrowserGraphqlEndpoint(): string {
  const configuredEndpoint =
    process.env.NEXT_PUBLIC_CIVIC_ATLAS_GRAPHQL_URL?.trim();

  if (process.env.NEXT_PUBLIC_CIVIC_ATLAS_DEPLOYMENT_TARGET === "gclba") {
    return (
      process.env.NEXT_PUBLIC_GCLBA_GRAPHQL_URL ??
      configuredEndpoint ??
      LOCAL_ATLAS_GRAPHQL_ENDPOINT
    );
  }

  if (configuredEndpoint) return configuredEndpoint;

  return isLocalBrowserHost()
    ? LOCAL_ATLAS_GRAPHQL_ENDPOINT
    : PUBLIC_ATLAS_GRAPHQL_ENDPOINT;
}

export function resolveCodegenSchema(): string {
  if (process.env.CIVIC_ATLAS_GRAPHQL_SCHEMA) {
    return process.env.CIVIC_ATLAS_GRAPHQL_SCHEMA;
  }

  if (isGclbaTarget()) {
    return (
      process.env.GCLBA_GRAPHQL_URL ??
      process.env.NEXT_PUBLIC_GCLBA_GRAPHQL_URL ??
      "http://127.0.0.1:8001/graphql"
    );
  }

  return "docs/design/flint-graphql-schema-v1.graphql";
}
