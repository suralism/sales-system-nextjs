# Repository Guidelines

## Project Structure & Module Organization
- Runtime code lives in `src/app` (Next.js App Router) with API handlers under `src/app/api`.
- Shared presentation belongs in `src/components`; providers and shared state are in `src/contexts`; utilities and data helpers reside in `src/lib`.
- Tests mirror those areas under `__tests__/api` and `__tests__/lib`; add new suites next to the directory they cover using `*.test.ts`.
- Reusable scripts stay in `scripts/`, documentation in `docs/`, and static assets in `public/`. Store environment secrets only in `.env.local`.

## Build, Test, and Development Commands
- `npm run dev` launches the local server with Turbopack at `http://localhost:3000`.
- `npm run build` performs the production Next.js build and will surface type or lint failures.
- `npm start` serves the compiled output; override the port via `PORT=4000`.
- `npm run lint` executes ESLint with the Next.js TypeScript config; resolve warnings before merging.
- `npm test`, `npm run test:watch`, and `npm run test:coverage` execute Jest; `npm run seed` loads sample data through `scripts/seed.ts`.

## Coding Style & Naming Conventions
- Write TypeScript with two space indentation and prefer functional React components.
- Name components in PascalCase (`CustomerTable.tsx`), hooks as `useX` (`useSessionGuard.ts`), and utilities in kebab-case (`credit-service.ts`).
- Import shared code through the `@/` base path defined in `tsconfig.json`; keep groups ordered external, internal, then relative.
- Run ESLint after substantial edits; formatter output must still pass `npm run lint`.

## Testing Guidelines
- Jest with React Testing Library powers unit coverage; consult `jest.config.js` and `jest.setup.js` for globals.
- Target at least 80% coverage on business logic and add regression tests for each API or calculation change.
- Prefer descriptive test names such as `it("rejects unpaid invoices")` and stage large fixtures in `__tests__/__fixtures__`.
- Use `npm run test:coverage` before pull requests that touch finance, auth, or persistence paths.

## Commit & Pull Request Guidelines
- History mixes free form messages and Conventional Commits; standardize on `type(scope): summary` (for example `feat(orders): add invoice aging`).
- Keep commits atomic with scopes that match the module touched (`auth`, `ui`, `api`); squash noisy work in progress commits.
- Pull requests need a concise summary, linked ticket or issue, screenshots for UI changes, and verification notes for `npm run lint` and `npm test`.
- Flag schema or seed adjustments in the description and document rollout steps in `docs/` when needed.

## Security & Configuration Tips
- Never commit real credentials; share sample keys via documentation or an updated `.env.example`.
- Validate request payloads in API routes and sanitize user input before persistence.
- Run `npm run seed` only against disposable development databases; production seeding requires manual approval.
