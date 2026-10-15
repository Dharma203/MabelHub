# Copilot Instructions for MabelHub

## Quick Commands

**Build & Dev:**
```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run start        # Run production build
```

**Test & Lint:**
```bash
npm test             # Run all tests
npm test -- --watch # Watch mode
npm test -- --coverage
npm run lint         # ESLint check
npm test -- src/lib/utils.test.ts  # Run specific test file
```

## Architecture

**Stack:** Next.js 16 (App Router) + TypeScript + MongoDB (native driver) + React + Tailwind + Jest

**Data Flow:**
- Auth: Session cookie (JWT token) → `src/middleware.ts` protects all routes
- Login: `POST /api/auth/login` validates username/email + password (bcrypt)
- API routes: `src/app/api/[module]/route.ts` handle GET/POST, connect to MongoDB directly
- Database: MongoDB (native driver via `clientPromise` from `src/lib/mongodb.ts`)

**Core Modules:**
- **Visits**: Track customer/partner visits with geo-tagging and metadata (`/api/visits/*`)
- **E-Procurement**: SPH requests, approval workflows, follow-up tracking (`/api/e-procurement/*`)
- **Tracking**: Broadcast messages, call tracking, database tracking with filters (`/api/tracking-*/*`)
- **Teams**: User teams and member management (`/api/teams/*`)
- **Contracts**: Contract management with reminders (`/api/contracts/*`)
- **Companies**: Registered companies and relationship tracking (`/api/companies/*`)

## Key Conventions

**API Route Pattern:**
```typescript
// src/app/api/[module]/route.ts
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "MabelHub");
  // Query and respond
}
```

**Testing:**
- Test files coexist with source: `src/lib/utils.test.ts` (not `__tests__` directory)
- Jest config: `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }`
- Pattern: Arrange-Act-Assert with edge case + error scenario coverage

**Path Alias:**
- Use `@/lib`, `@/components`, `@/utils` (mapped to `src/` via `tsconfig.json`)
- Avoid relative imports; always use `@/`

**Utility Functions:**
- `src/lib/utils.ts`: General utilities (`cn`, `formatBulan`, date helpers, pagination)
- `src/lib/api-helpers.ts`: Request/response helpers for API routes
- `src/lib/jwt.ts`: Session signing/verification with JWTs
- `src/lib/password.ts`: bcrypt hashing/verification

**Auth Model (MongoDB `users` collection):**
```typescript
{
  _id: ObjectId,
  fullName: string,
  email: string (lowercase),
  username: string (lowercase),
  passwordHash: string,
  role: "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES",
  isActive: boolean
}
```
- Middleware checks `session` cookie; no session = 401 JSON for API or redirect to `/` for pages
- Public paths: `/`, `/api/auth/login`, `/api/download`, static files

**Naming Conventions:**
- Camel case for functions/variables, kebab-case for filenames
- Bahasa Indonesia for function names/comments is standard (formatBulan, satuan, etc.)

## Environment Setup

**Required `.env.local`:**
```
MONGODB_URI=mongodb://...
MONGODB_DB=MabelHub
```

**Optional (Google Sheets Export):**
```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
NEXT_PUBLIC_GOOGLE_SHEETS_ENABLED=true
```
See `GOOGLE_SHEETS_SETUP.md` for full setup.

## Database Notes

- MongoDB is used directly (no ORM); queries in route handlers
- Lowercase usernames and emails stored for case-insensitive lookups
- Collections: `users`, `teams`, `visits`, `tracking_broadcast`, `tracking_call`, `contracts`, `companies`, `e_procurement_requests`, etc.
- No schema validation at DB layer; validate in API routes before insert/update

## Common Pitfalls

1. **Never store credentials in code.** Secrets live in `.env.local` only.
2. **Test isolation:** Mock MongoDB operations in tests to avoid DB dependency; see `src/app/api/tracking-broadcast/route.test.ts` for patterns.
3. **Pagination consistency:** APIs enforce min/max limits (e.g., 1–500 for limit). Use `getPageWindow()` for offset calculation.
4. **Query parsing:** Multi-select filters via `parseMultiSelect()` (e.g., `?bulan=1,2,3`); date ranges via `startDate`/`endDate`.
5. **TypeScript strict mode:** All types explicit; no implicit `any`.
6. **Middleware cookie checking:** Always decode session cookie safely; malformed tokens return 401.

## Performance Notes

- Turbopack enabled for faster builds in dev
- Source maps enabled in production for debugging
- Images remapped to allow localhost + hub.mabel.co.id + api.mabel.co.id
- ESLint + Next.js recommended rules; fix linting errors before commit

## Testing Patterns

- Run targeted tests before full suite: `npm test -- src/lib/utils.test.ts`
- Coverage thresholds: branches, functions, lines tracked in Jest config
- Error scenarios: malformed JSON, missing fields, DB failures, boundary values (e.g., limit > 500)
