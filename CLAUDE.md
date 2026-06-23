# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build/dev server
- **React Router v7** for routing
- **Axios** for API communication
- **ESLint** with TypeScript ESLint for linting

## Project Architecture

### Structure

```
src/
├── components/
│   └── logs/              # Reusable log-related components
├── pages/                 # Page components (route targets)
├── services/              # API service layer
├── types/                 # TypeScript type definitions
├── App.tsx                # Router setup + layout (sidebar)
└── main.tsx               # Entry point
```

### Key Patterns

**Service Layer**: Services are objects with async methods that use `apiClient`. Example:
```typescript
export const auditLogService = {
  async getLogs(filters: AuditLogFilters): Promise<AuditLog[]> { ... }
};
```

**Routing**: Routes defined in `App.tsx` with a persistent sidebar layout.

**API Client**: Centralized `apiClient` in `src/services/api.ts` with:
- Base URL from `VITE_API_BASE_URL` env var (default: `http://localhost:5000/api`)
- Auth interceptor that adds `Authorization: Bearer <token>` from `localStorage`

**Path Aliases**: `@` → `./src` (configured in Vite and tsconfig)

**Components**: Vietnamese UI text; functional components with hooks; composition pattern.

## Common Commands

```bash
# Development
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # TypeScript check + Vite production build (output: dist/)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

**Note**: No test script configured yet. CI expects `npm run test` (see `.github/workflows/ci-cd.yml`). Tests should be added when implementing test coverage.

## Environment

- Requires Node.js 20.x (per CI)
- Create `.env` file with:
  ```
  VITE_API_BASE_URL=http://localhost:5000/api
  VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
  ```

## API Endpoints (Backend)

Audit logs: `GET /admin/audit-logs` (with filters), `/admin/audit-logs/user/{userId}`, `/admin/audit-logs/entity/{entityType}`
Warehouse metrics: `GET /admin/metrics/warehouse/{warehouseId}`, `/admin/metrics/type/{metricType}`, `/admin/metrics/latest/{warehouseId}/{metricType}`

## CI/CD

- Branches: `main` (production), `develop` (staging)
- Pipeline: lint → test → build → SonarCloud → upload artifact → deploy
- Runs on Node.js 20.x, uses `npm ci`
