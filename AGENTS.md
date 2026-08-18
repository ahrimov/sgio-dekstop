# AGENTS.md

## Project

SGIO Desktop is an Electron application with a React renderer. It works with local
SQLite/SpatiaLite databases and map data. The project uses ES modules, except for the
CommonJS preload script required by Electron.

## Commands

- Install dependencies: `npm install`
- Development: run `npm run dev-react` and `npm run dev` in separate terminals.
- Build and package: `npm run build`
- Check changed JS/JSX/TS/TSX files: `npx eslint <files>`
- Format changed files: `npx prettier --write <files>`

There is currently no automated test script. At minimum, run the relevant build or ESLint
check after a change. Do not run packaging when a renderer-only build is sufficient;
`npm run build-react` builds the renderer.

## Architecture

- `src/` contains the React renderer, Effector stores, UI features, and legacy map code.
- `electron/` contains the main process, IPC handlers, database access, and ILI services.
- `electron/preload.js` is the only renderer-to-main bridge. Add privileged operations via
  a focused IPC handler and expose them through `window.electronAPI`.
- `src/assets/resources/Project/` contains runtime project resources: XML layer definitions,
  SQL query definitions, database templates, and migrations.
- `plans/` documents implemented and planned ILI workflows. Treat code and current resource
  files as the source of truth when a plan differs from the implementation.
- `server/baseserver_ute-master/` is the legacy server reference, not the desktop runtime.

## Working conventions

- Follow `.prettierrc`: tabs, single quotes, semicolons, 100-column width, trailing commas
  where valid in ES5.
- Keep filesystem, dialogs, database access, and other Node/Electron APIs out of renderer
  code; use the preload/IPC boundary.
- Keep IPC channel names and argument order synchronized between the handler and preload API.
- SQL used by the desktop app must be compatible with SQLite/SpatiaLite. Do not copy
  PostgreSQL-only syntax from the legacy server unchanged.
- Preserve the existing XML-driven layer and query configuration unless the task explicitly
  calls for a migration away from it.
- Reuse existing Effector stores/events and the global `ModalDialog` helpers when extending
  related UI flows.
- Make focused changes. Do not edit generated output under `dist/` or `public/dist/`.
- Do not modify template databases or user data under `sgio-data/` unless the task explicitly
  requires a data/schema change; add schema changes as migrations when appropriate.

## Verification

For each change, report what was checked and any checks that could not be run. For changes
that cross the Electron boundary, verify the complete renderer → preload → IPC handler flow.
For database or map-resource changes, verify both the relevant XML/SQL definition and its
consumer in code.
