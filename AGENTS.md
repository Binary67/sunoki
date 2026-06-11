<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Database

- Do not add database migration, backfill, or old-schema compatibility code. This project is still in development; when the schema changes, update the current schema and seed data only. A stale local database can be deleted and recreated with `npm run seed`.

## Validation

- Fast static validation, such as linting or type checking, is allowed by default.
- Do not run runtime tests, browser checks, or browser-use tooling by default. The user will run those manually.
- Run runtime tests or browser checks only when the user specifically asks for them.
