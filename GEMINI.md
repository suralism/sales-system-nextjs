# GEMINI.md

## Project Overview

This is a sales management system built with Next.js, TypeScript, and MongoDB. It allows employees to record sales and manage product inventory. The application uses JWT for authentication and features role-based access control (admin and employee roles).

**Key Technologies:**

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Database:** MongoDB with Mongoose
*   **Authentication:** JWT (JSON Web Tokens)
*   **Styling:** Tailwind CSS (inferred from `postcss.config.mjs` and `tailwindcss` dependency)

**Architecture:**

*   The application follows a standard Next.js project structure.
*   The frontend is built with React and communicates with the backend through API routes.
*   API routes are located in `src/app/api/` and handle business logic and database interactions.
*   MongoDB models for `User`, `Product`, and `Sale` define the database schema.
*   Authentication is handled via JWTs, with login, logout, and session management API routes.

## Building and Running

**1. Installation:**

```bash
npm install
```

**2. Running in Development Mode:**

```bash
npm run dev
```

This will start the development server, typically on `http://localhost:3000`.

**3. Building for Production:**

```bash
npm run build
```

**4. Running in Production Mode:**

```bash
npm run start
```

**5. Linting:**

```bash
npm run lint
```

## Development Conventions

*   **Coding Style:** The project uses ESLint for code linting. The configuration can be found in `eslint.config.mjs`.
*   **Authentication:** Authentication is handled using JWTs. The token is stored in an HTTP-only cookie. The `AuthContext` provides authentication state to the frontend.
*   **Database:** The project uses Mongoose to interact with a MongoDB database. Models are defined in `lib/models/`.
*   **API Routes:** API routes are used for all backend logic. They are located in `src/app/api/`.
