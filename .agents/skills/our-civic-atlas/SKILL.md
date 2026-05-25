```markdown
# our-civic-atlas Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill documents the core development conventions and workflows for the `our-civic-atlas` repository, a TypeScript project built with Next.js. The codebase is organized around modular feature development, GraphQL contracts, and a focus on maintainable, scalable civic planning tools. This guide covers file naming, import/export styles, typical commit patterns, and the main workflows for adding features, syncing branches, and managing dependencies.

## Coding Conventions

### File Naming

- **CamelCase** is used for file names.
  - Example: `openFlintAtlas.tsx`, `planDetails.ts`

### Import Style

- **Alias imports** are preferred for internal modules.
  - Example:
    ```typescript
    import { getAtlasData } from '@/lib/atlas/getAtlasData';
    import PlanCard from '@/components/atlas/PlanCard';
    ```

### Export Style

- **Named exports** are standard.
  - Example:
    ```typescript
    // src/lib/atlas/getAtlasData.ts
    export function getAtlasData() { ... }
    ```

### Commit Patterns

- Mixed types, with prefixes like `merge`, `feat`, and `fix`.
- Example commit messages:
  - `feat: add plan details component for atlas module`
  - `fix: correct GraphQL query for plan list`
  - `merge: sync main into feature/atlas-planner`

## Workflows

### Feature Module Expansion with GraphQL Contract
**Trigger:** When adding or expanding a feature/module with UI, data, and API contract changes  
**Command:** `/new-feature-module`

1. **Edit or add GraphQL schema**
   - Update `docs/design/flint-graphql-schema-v1.graphql` with new types or fields.
2. **Add or update GraphQL queries/mutations**
   - Place `.graphql` files in `src/lib/api/graphql/queries/`.
3. **Regenerate GraphQL types**
   - Run your codegen script to update `src/lib/api/graphql/generated/gql.ts` and `graphql.ts`.
4. **Add or update UI components**
   - Work in `src/components/atlas/` or `src/app/open-flint-atlas/plan/`.
   - Example:
     ```tsx
     // src/components/atlas/PlanCard.tsx
     export function PlanCard({ plan }) { ... }
     ```
5. **Update supporting TypeScript logic**
   - Add or modify files in `src/lib/atlas/`.
6. **Add or update fixtures/data**
   - Place sample data in `src/data/open-flint-atlas/fixtures/`.
7. **Update documentation**
   - Document changes in `docs/plans/`.
8. **Update config if needed**
   - Edit `tsconfig.json` or `next-env.d.ts` if types or paths change.

### Merge Main into Feature Branch with Atlas Module Sync
**Trigger:** When syncing a feature branch with the latest changes from `main`, especially for atlas modules  
**Command:** `/sync-main`

1. **Merge `main` into your feature branch**
   - Resolve any conflicts, especially in shared modules.
2. **Update documentation**
   - Sync or add docs in `docs/plans/` and `docs/design/`.
3. **Sync shared UI components**
   - Update files in `src/components/atlas/`.
4. **Sync atlas logic**
   - Update files in `src/lib/atlas/`.
5. **Sync data fixtures**
   - Update `src/data/open-flint-atlas/fixtures/`.
6. **Update dependencies if needed**
   - Edit `package.json` and regenerate `package-lock.json` if dependencies changed.

### Dependency Lockfile Update
**Trigger:** When dependencies change or deployment issues require lockfile updates  
**Command:** `/update-lockfile`

1. **Edit dependencies**
   - Update `package.json` as needed.
2. **Regenerate lockfile**
   - Run `npm install` or `npm update` to update `package-lock.json`.
3. **Edit config files if needed**
   - Update `.npmrc` or other config files for deployment.

## Testing Patterns

- **Test files** use the pattern `*.test.*` (e.g., `planDetails.test.ts`).
- **Testing framework** is not specified; check for a `jest.config.js` or similar to confirm.
- Example test file:
  ```typescript
  // src/lib/atlas/planDetails.test.ts
  import { getPlanDetails } from './planDetails';

  test('returns correct plan details', () => {
    expect(getPlanDetails('plan-123')).toEqual({ ... });
  });
  ```

## Commands

| Command               | Purpose                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| /new-feature-module   | Start a new feature or expand an existing module with GraphQL contracts  |
| /sync-main            | Merge latest changes from main into your feature branch                  |
| /update-lockfile      | Update dependency lockfiles and config after dependency changes          |
```
