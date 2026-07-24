# UI design tokens & theming (WizFDS)

> Curated spec for the **neutral grey + green** dark re-skin on branch `ui-refresh-slate-green` (2026-07-23),
> refined 2026-07-24 into a **"technical console"** direction: deeper near-black base, blueprint atmosphere,
> section-header markers, compact checkboxes, and right-aligned numeric fields.
> Seeded by the `ui-ux-pro-max` skill (category *Productivity Tool*), then refined during grilling + `frontend-design`.
> This file — not the tool's scratch `design-system/` folder (git-ignored) — is the source of truth.

## Scope

A **token-level re-skin**: palette + typography + spacing/shadows. **No layout or component-structure changes.**
The app was already dark (`pink-bluegrey` prebuilt + dark grey SCSS vars); this is a *re-palette within dark mode*
(dark grey + blue → neutral grey + green), not a light→dark switch. The greys are pure (R=G=B), deliberately free of any blue/slate tint.

## Decisions (resolved in grilling)

| Topic | Decision |
|---|---|
| Depth | Token re-skin only (palette / type / spacing); layouts untouched |
| Material theming | **Angular Material 20 M3** via `mat.theme` — replaces the legacy `@import` of `pink-bluegrey` |
| Token architecture | Two layers (primitive + semantic) as **CSS custom properties** in `:root` |
| Legacy vars | `$grey*`, `$blue`, `$green`, … **re-mapped to `var(--token)`** (shim) so existing SCSS adopts the palette without per-file rewrites |
| Accent | **Green `#22c55e` = primary action** (Material primary). Neutral grey = surfaces, red = destructive. `success/valid` states must use an **icon**, not green alone (green is now the action color) |
| Typography | **Fira Sans** (UI) + **Fira Code** (mono / editor), **self-hosted** woff2 (GDPR + offline + no FOUT) |
| Fonts on-accent | Dark text on green (`--on-accent: #141414`) — white on `#22c55e` fails WCAG AA |

## Files

| File | Role |
|---|---|
| `projects/wizfds/src/styles/_tokens.scss` | Primitives + semantic tokens (`:root`) — **the palette** |
| `projects/wizfds/src/styles/_theme.scss` | M3 `mat.theme` (green primary, dark) + maps `--mat-sys-*` onto our tokens |
| `projects/wizfds/src/styles/_fonts.scss` | `@font-face` for self-hosted Fira (files in `assets/fonts/fira/`) |
| `projects/wizfds/src/styles.scss` | `@use`s the three partials at top; legacy `$var` shim; component-chrome color fixes |
| `projects/wizfds/src/app/app.component.scss` | Local palette block re-mapped to tokens → cascades to **27** components via `@use` |
| `projects/wizfds/src/styles/_forms.scss` | Modern **filled** form controls (native input / textarea / ng-select) |

## Palette (semantic → primitive)

```
--surface        #101010   app background          --accent        #22c55e   action / "run"  (Material primary)
--surface-1      #181818   panels, cards           --accent-hover  #4ade80
--surface-2      #202020   muted, hover fills      --accent-active #16a34a
--surface-3      #2b2b2b   raised, active rows     --on-accent     #101010   (dark text on green — AA)
--on-surface     #f5f5f5   text                    --danger        #ef4444   destructive
--on-surface-muted #a0a0a0 secondary text          --warning       #f59e0b   (was orange)
--border         #3d3d3d                            --info          #29b6f6   links / info (legacy blue kept)
--border-muted   #2b2b2b                            --focus-ring    #22c55e

Deep near-black neutral ramp: --grey-950 #101010 · -900 #181818 · -850 #202020 · -800 #2b2b2b · -600 #3d3d3d · -500 #6e6e6e · -400 #a0a0a0 · -200 #d4d4d4 · -50 #f5f5f5.
Depth & atmosphere: --edge-highlight rgba(255,255,255,.045) · --edge-shadow rgba(0,0,0,.5) · --accent-glow rgba(34,197,94,.13) · --accent-soft rgba(34,197,94,.09) · --grid-dot rgba(255,255,255,.045).
```
Spacing `--space-xs…3xl` (4→64px), radii `--radius-sm/md/lg`, shadows `--shadow-sm…xl`, fonts `--font-ui` / `--font-mono` — see `_tokens.scss`.

## How the palette propagates

1. `_tokens.scss` defines all tokens on `:root` → globally available to **every** component stylesheet at runtime (CSS custom properties ignore SCSS file-scoping).
2. `mat.theme` themes all Material components; `--mat-sys-*` are pinned to our tokens so Material surfaces match the app chrome.
3. The **legacy shim**: `$grey1…$grey6`, `$blue`, `$green`, `$body`, … now equal `var(--token)`. Because 27 component stylesheets `@use "…/app.component.scss"`, re-mapping that one variable block re-skins them all. (Safe: no SCSS color functions — `lighten`/`darken`/`rgba($…)` — are applied to these vars anywhere.)

## Atmosphere & depth (technical-console refinement)

Applied on top of the flat re-skin so the deep base doesn't read as dead-flat:

- **Blueprint canvas**: a faint dot-grid on the working area — `.main { background-image: radial-gradient(circle at 1px 1px, var(--grid-dot) 1px, transparent 0); background-size: 22px 22px; }` (global rule; adds image over `.main`'s surface colour). `body` also carries a faint top-right accent aura (`radial-gradient(... var(--accent-soft) ...)`).
- **Section headers** (`main.component.scss` → `.form-title`): reborn as technical panel labels — `linear-gradient(180deg, surface-3, surface-2)` bar, `border-top: 1px solid var(--edge-highlight)`, seating shadow, a **2px inset green section marker** (`inset 2px 0 0 var(--accent)` → no layout shift), and the label set to **uppercase, `letter-spacing: .09em`, `0.72rem`, muted**.
- **Machined depth**: inputs get a subtle `inset 0 1px 2px rgba(0,0,0,.18)`; raised surfaces use `--edge-highlight` / `--edge-shadow` for a "milled casing" feel.

## Form controls (`styles/_forms.scss`)

Native `<input>`/`<textarea>` and ng-select dropdowns use a **filled** style. The app keeps its own *label-beside-field* layout — no Angular Material `mat-form-field` (its floating labels + tall footprint would break the dense grid and duplicate labels across 24 templates). Checkboxes stay on the M3 theme (`mat-checkbox`, green).

- **Fill**: `background: var(--surface-2)`, `border: 1px solid var(--border-muted)`, `border-radius: var(--radius-sm)`, `height: 1.5rem`, `padding: 0 6px`, `box-sizing: border-box`, `box-shadow: inset 0 1px 2px rgba(0,0,0,.18)` (machined depth) — compact (24px tall).
- **Value text**: mono (`--font-mono`, Fira Code) in `--on-surface`. The old orange-underline value style is gone.
- **Labels**: FDS form labels are `0.8rem`, set at their real source `main.component.scss` (`.amper-container .form-box .form-row div label` — a scoped rule that outranks a global `.form-row label`, confirmed via CDP `getMatchedStylesForNode`).
- **Hover** → `border-color: var(--border)`. **Focus** → `border-color: var(--accent)` + `box-shadow: inset 0 1px 2px rgba(0,0,0,.12), 0 0 0 3px var(--accent-glow)` (soft green glow, all four sides). **Error** → `input.ng-invalid.ng-touched` gets a red border + red glow (`ngModel` sets the classes; a no-op where a directive doesn't validate).
- **ng-select**: `.ng-select-container` mirrors the filled look; dropdown panel = `--surface-1` + `--shadow-lg`; marked option = `--surface-2`, selected = `--surface-3` with green text. Focus uses `.ng-select-focused:not(.ng-select-opened) > .ng-select-container` (+ opened) to **beat the ng-select default-theme's blue bottom-border/underline** — the active dropdown border is green, not a blue underline. The typed search text is pinned to `--on-surface` so it's clearly visible on the fill.
- **Critical resets**: `.ng-select input` (its inner search box) and `.CodeMirror input`/`textarea` (the editor's hidden capture field) are stripped back to no-box, so the global filled style doesn't box-in-a-box them.
- **Number-input directives** (`decimal-input` / `integer-input` / `rgb-input`) previously drew an inline `border-bottom` (white default, `#FF9800` orange on focus, red invalid), which made number inputs diverge from text inputs. They now set only `borderColor: var(--danger)` when the value is invalid and clear it otherwise — so number and text inputs share the identical CSS style (grey filled box, **green border incl. bottom on focus**), and invalid numbers show a red border.

- **Numeric fields right-aligned**: `input[decimalinput] / [integerinput] / [rgbinput] { text-align: right; }` so values hug the right edge next to their unit (engineering-readout convention); text fields stay left-aligned.
- **Compact checkboxes**: Material's oversized state layer is shrunk — `.mat-mdc-checkbox { --mdc-checkbox-state-layer-size: 24px; }` plus `mat.checkbox-density(-3)` in `_theme.scss` — so the green hover is a tidy disc and the checkbox (40→28px) lines up with the 24px inputs instead of sitting low.

All 210 native inputs + 144 ng-selects adopt this from one file; component stylesheets don't override input appearance (verified), so nothing competes with it. `_forms.scss` is `@use`d **after** the ng-select prebuilt theme so its overrides win.

## Out of scope (deliberately left as-is)

- **CodeMirror syntax theme** — `app/views/main/fds/input-file/css/{codemirror,fds,foldgutter,show-hint,simplescrollbars,dialog}.scss` hold the *code-editor syntax colors* (keyword/string/number hues). Re-theming the editor syntax is a separate pass.
- **Material Icons via Google CDN** — `index.html` still `<link>`s `fonts.googleapis.com/icon?family=Material+Icons`. Same GDPR argument as the fonts; a follow-up could self-host it (or drop it if only MDI/`mdi.svg` is used). The **UI/mono fonts are already self-hosted** and the `Play` Google-Fonts link was removed.

## To extend

- **Change the palette** → edit primitives/semantics in `_tokens.scss` only.
- **Add a Material override** → add a `--mat-sys-*` line in `_theme.scss` (inside the `& {}` block).
- **New component color** → use `var(--token)` directly; avoid new hardcoded hex and avoid reintroducing `$grey*`.

## Verification

`ng build wizfds` compiles clean (fonts bundled to `media/`). Visual check: `npm run wizFds:start` and review the editor, forms/dialogs, and viewer chrome.
