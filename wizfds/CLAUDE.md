# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WizFDS is a GUI for Fire Dynamics Simulator (FDS). It consists of a web application for setting boundary conditions and an AutoCAD/BricsCAD/GStarCAD plugin for geometry creation. The two communicate via WebSocket. The production instance runs at wizfds.com.

## Workspace Structure

Angular 20 multi-project workspace with 4 projects defined in `angular.json`:

| Project | Type | Root | Purpose |
|---------|------|------|---------|
| **wizfds** | application | `projects/wizfds` | Main web app - FDS scenario editor |
| **webSmokeview** | application | `projects/webSmokeview` | Standalone 3D results viewer |
| **wizWelcome** | application | `projects/wizWelcome` | Landing/welcome page |
| **webSmokeviewLib** | library | `projects/web-smokeview-lib` | Shared 3D visualization library (BabylonJS) |

## Commands

```bash
# Dev servers
npm run wizFds:start      # wizfds app at localhost:4200
npm run webSmv:start      # webSmokeview app
npm run wizWel:start      # wizWelcome app

# Production builds
npm run wizFds:build-prod
npm run webSmv:build-prod
npm run webSmvLib:build-prod
npm run wizWel:build-prod

# Tests (Karma + Jasmine)
npm test                  # ng test (default project)
ng test wizfds            # specific project
ng test webSmokeviewLib   # library tests

# CodeMirror addons (must run after npm install)
npm run wizFds:cm:copy    # copies custom FDS mode/hints/folding to node_modules
```

## Architecture

### wizfds App - Core Services

- **MainService** (`services/main/`) - Central state holder. `Main` object contains user settings, current project/scenario, websocket config, idle timer. All services subscribe to it via `mainSubject` BehaviorSubject.
- **FdsScenarioService** (`services/fds-scenario/`) - CRUD for FDS scenarios via REST API. Manages auto-save with `syncType` variants: `'head'` (name only), `'input'` (FDS text file), `'all'` (full object).
- **JsonFdsService** (`services/json-fds/`) - Converts internal JSON FDS object to FDS input text file format. `json2fds()` is the main export method. Uses `parseAmper()` to serialize each FDS namelist group (e.g., `&MESH`, `&OBST`, `&SURF`).
- **WebsocketService** (`services/websocket/`) - WebSocket connection to CAD plugin. Handles bidirectional geometry sync (`fExport` imports from CAD, `selectCad`/`fSelect` handles element selection).
- **CadService** (`services/cad/`) - Transforms CAD geometry elements into FDS objects. Each `transform*()` method merges incoming CAD data with existing scenario elements using `idAC` (AutoCAD object ID) for matching, and imports referenced library items (materials, ramps, etc.).
- **HttpManagerService** (`services/http-manager/`) - HTTP client wrapper with progress tracking. All API calls return `Result` with `{meta: {status, from, details[]}, data}` structure.
- **LibraryService** (`services/library/`) - Manages user's reusable FDS element library (surfaces, materials, ramps, jet fans, etc.).
- **UiStateService** (`services/ui-state/`) - Persists UI state per scenario (selected elements, scroll positions, etc.).

### FDS Object Model (`services/fds-object/`)

The `Fds` class (`fds-object.ts`) is the central data model representing an FDS simulation scenario:
- `general` - HEAD, TIME, MISC, INIT namelist groups
- `geometry` - meshes, obsts, holes, opens, surfs, matls, geoms
- `ventilation` - surfs (SurfVent), vents, jetfans
- `fires` - fires, combustion, fuels
- `specie` - specs, surfs (SurfSpec), vents
- `output` - dump, devcs, bndfs, slcfs, isofs
- `ramps` - shared RAMP definitions

Each entity class takes a JSON string in its constructor and has a `toJSON()` method. FDS entity attribute definitions (types, defaults) are in `enums/fds/entities/fds-entities.ts`.

### web-smokeview-lib

BabylonJS-based 3D rendering library **using WebGPU engine with WGSL shaders**. GLSL shaders in `src/assets/shaders/glsl/` are maintained as fallback only. Key services:
- `BabylonService` - Scene setup and rendering
- `SmokeviewApiService` - Public API for the library
- Drawing services per entity type: `obst`, `mesh`, `slice`, `hole`, `vent`, `jetfan`, `geom`, `open`, etc.
- Shader files in `src/assets/shaders/`

The wizfds app imports this library directly via source path (not npm):
```typescript
import { SmokeviewModule } from '../../../web-smokeview-lib/src/lib/views/smokeview/smokeview.module';
```

### Backend

PHP REST API in `projects/wizfds/backend/` using FastRoute router. PostgreSQL database. Session-based auth. Key endpoints:
- `/api/projects`, `/api/project/{id}` - Project CRUD
- `/api/fdsScenario/{id}` - Scenario CRUD
- `/api/library` - User library
- `/api/settings` - User settings
- `/api/categories` - Category management

### Dev Proxy

`projects/wizfds/proxy.conf.js` proxies `/api`, `/logout`, `/register`, `/login` to `fliszer.vdl.pl` for local development. The proxy rewrites cookies to work on localhost.

## TypeScript Path Aliases (wizfds project)

Defined in `projects/wizfds/tsconfig.app.json`, baseUrl is `./src`:
- `@services/*` → `app/services/*`
- `@directives/*` → `app/directives/*`
- `@enums/*` → `app/enums/*`
- `@pipes/*` → `app/pipes/*`
- `@env/*` → `environments/*`

## Key Patterns

- **Object serialization**: FDS model classes use `new ClassName(JSON.stringify(data))` constructor pattern and `toJSON()` for serialization. Use lodash's `cloneDeep` before mutating objects for export.
- **Component style**: SCSS for styles, Angular Material + MDI icons for UI. Components use `ngx-scrollbar` and `@ng-select/ng-select` for scrollable areas and dropdowns.
- **CodeMirror**: Custom FDS syntax mode, hints, and folding are in `codemirror_addons/` and must be copied to `node_modules` via `npm run wizFds:cm:copy` after install.
- **Charts**: D3.js v5 for ramp charts and parabola visualization.
- **KaTeX**: Used for rendering mathematical formulas (e.g., fire equations).
- **lodash**: Heavily used throughout the codebase for collection operations.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as GitHub issues on `fkce/WizFDS` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root (created lazily by `/domain-modeling`). See `docs/agents/domain.md`.
