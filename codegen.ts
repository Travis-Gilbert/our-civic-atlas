import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * GraphQL codegen config for the Civic Atlas client.
 *
 * Schema source: the Flint GraphQL contract at
 *   docs/design/flint-graphql-schema-v1.graphql
 *
 * The contract is the curation boundary — only types defined there can be
 * requested. Theseus implements its side against this same schema using
 * Strawberry; the atlas implements its side using urql + this codegen.
 *
 * Generated output: `src/lib/api/graphql/generated/`
 *
 * Documents scan: every `.graphql` operation file in `src/` plus inline
 * tagged template literals.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: "docs/design/flint-graphql-schema-v1.graphql",
  documents: ["src/**/*.graphql", "src/**/!(generated)/*.{ts,tsx}"],
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
