---
name: feature-module-expansion-with-graphql-contract
description: Workflow command scaffold for feature-module-expansion-with-graphql-contract in our-civic-atlas.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-module-expansion-with-graphql-contract

Use this workflow when working on **feature-module-expansion-with-graphql-contract** in `our-civic-atlas`.

## Goal

Adds or expands a feature module, including new UI components, GraphQL schema/queries/mutations, generated types, and documentation.

## Common Files

- `docs/design/flint-graphql-schema-v1.graphql`
- `src/lib/api/graphql/queries/*.graphql`
- `src/lib/api/graphql/generated/gql.ts`
- `src/lib/api/graphql/generated/graphql.ts`
- `src/components/atlas/*.tsx`
- `src/app/open-flint-atlas/plan/**/*.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit or add GraphQL schema in docs/design/flint-graphql-schema-v1.graphql
- Add or update GraphQL queries/mutations in src/lib/api/graphql/queries/*.graphql
- Regenerate GraphQL types in src/lib/api/graphql/generated/gql.ts and graphql.ts
- Add or update UI components in src/components/atlas/ and src/app/open-flint-atlas/plan/
- Update or add supporting TypeScript logic in src/lib/atlas/

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.