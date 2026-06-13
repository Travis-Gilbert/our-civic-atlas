import type { CodegenConfig } from "@graphql-codegen/cli";
import { resolveCodegenSchema } from "./src/lib/api/graphql/endpoints";

/**
 * GraphQL codegen config for the Civic Atlas client.
 *
 * Schema source defaults to the Flint GraphQL contract at
 *   docs/design/flint-graphql-schema-v1.graphql.
 *
 * GCLBA fork override:
 *   CIVIC_ATLAS_DEPLOYMENT_TARGET=gclba npm run codegen
 *   CIVIC_ATLAS_GRAPHQL_SCHEMA=http://127.0.0.1:8001/graphql npm run codegen
 *
 * The contract is the curation boundary — only types defined there can be
 * requested. Theseus implements its side against this same schema using
 * Strawberry; the atlas implements its side using urql + this codegen.
 *
 * Generated output: `src/lib/api/graphql/generated/`
 *
 * Documents scan: every `.graphql` operation file in `src/`.
 * Inline GraphQL strings should mirror a checked-in `.graphql` operation
 * rather than becoming a second codegen source; that keeps codegen from
 * parsing unrelated TypeScript syntax in UI/runtime files.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: resolveCodegenSchema(),
  documents: ["src/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "src/lib/api/graphql/generated/": {
      preset: "client",
      presetConfig: {
        gqlTagName: "gql",
      },
      config: {
        useTypeImports: true,
        scalars: {
          DateTime: "string",
          GeoJSON: "Record<string, unknown>",
          LatLng: "[number, number]",
          JSON: "Record<string, unknown>",
        },
      },
    },
  },
};

export default config;
