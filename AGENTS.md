# Repository Guidelines

## Project Structure & Module Organization
- Source: `app/` (Next.js App Router) or `pages/` (Pages Router), UI in `components/`, utilities in `lib/`, styles in `styles/`, static assets in `public/`.
- Tests: `__tests__/` or co-located `*.test.ts(x)`/`*.spec.ts(x)`.
- Types & hooks: `types/` for shared TypeScript types, `hooks/` for React hooks (e.g., `useCart.ts`).
- Data & config: `prisma/` or `db/` for schema/migrations if present; environment in `.env*`.

## Build, Test, and Development Commands
- `npm run dev` (or `pnpm dev`): Start local dev server at `http://localhost:3000` with HMR.
- `npm run build`: Production build (`.next/`). Fails on type/lint errors if configured.
- `npm start`: Serve the production build.
- `npm run lint`: Run ESLint over `app|pages`, `components`, `lib`, etc.
- `npm test`: Run unit tests; use `npm test -- --watch` during development.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; TypeScript-first (`.ts/.tsx`).
- Components: PascalCase (`ProductCard.tsx`); hooks: `useX` camelCase (`useCheckout.ts`).
- Files: kebab-case for non-components (`order-service.ts`); constants in SCREAMING_SNAKE_CASE.
- Imports: absolute paths via `tsconfig.json` `paths` when available; group std/lib/relative.
- Formatting & linting: Prettier + ESLint (Next.js/React/TypeScript plugins). Run `npm run lint` before PRs.

## Testing Guidelines
- Framework: Jest or Vitest with React Testing Library.
- Location: `__tests__/` mirror of `app|pages/components/lib` or co-located next to source.
- Names: `*.test.ts(x)` for units, `*.spec.ts(x)` for integration.
- Coverage: Target ≥80% statements/branches on modules with business logic.
- Commands: `npm test` (CI), `npm test -- --coverage` for reports.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat(cart): add quantity selector`, `fix(api): handle 404`).
- Scope: use folder or domain (`cart`, `orders`, `api`, `ui`). Keep commits atomic.
- PRs: Include summary, linked issue, screenshots for UI, and test notes. Ensure `npm run lint` and `npm test` pass.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local`; provide `.env.example` with non-sensitive keys.
- Validate all API inputs; sanitize user content.
- If using Prisma/DB: document migration steps (`npx prisma migrate dev`) in the PR when schema changes.

