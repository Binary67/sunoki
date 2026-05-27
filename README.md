## Sunoki

Sunoki is a Next.js app for facility booking, guest profile operations, admin
data management, and backup/restore workflows.

## Runtime

Use Node 24.x for local development and deployment. The app uses the built-in
`node:sqlite` module and expects a writable local filesystem for SQLite data.

The committed `.node-version` file pins the local runtime target to Node 24.

## Local Setup

Install dependencies from the committed lockfile, seed the local SQLite data,
and start the development server:

```bash
npm ci
npm run seed
npm run dev
```

Open `http://localhost:3000` in your browser.

## Local Data

The SQLite database is created at `data/sunoki.db` relative to the project
working directory. The `data/` directory is gitignored and must not be committed.

Running `npm run seed` creates local development data:

- Admin users:
  - `superadmin` / `superadmin123`
  - `admin` / `admin123`
- Facility records and default time slots.
- Package entitlement defaults, reset to the values in code.

The seeded credentials are for local development only. Do not use them for
deployed environments.

## Backup And Restore

Admin backup exports and imports use workbook files. Before a restore is
applied, the app writes an automatic pre-restore backup under `data/backups`.

Because backup files are under `data/`, they are local runtime data and are not
tracked by git.

## Deployment Notes

Deployments must run on Node 24.x and provide persistent writable storage for
the `data/` directory. A deployment with ephemeral serverless storage is not a
correct fit unless `data/` is backed by a persistent mounted volume.

Do not deploy with the local seed credentials. Provision production users and
data through the intended admin workflow or a controlled data restore.
