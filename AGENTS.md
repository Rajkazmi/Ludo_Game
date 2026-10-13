# AGENTS.md

## Project overview

This repository is a React Native Ludo game. It contains:

- `Screens/` — screen-level UI and behavior.
- `Components/` — reusable UI components and Ludo board pieces.
- `Components/path/` — board path/cell rendering.
- `redux/` — Redux state, reducers/actions, selectors, persistence, and store setup.
- `helpers/` — navigation, sound, icon/image lookup, and board-data helpers.
- `constants/` — shared colors and device scaling values.
- `Navigation/` — React Navigation configuration and navigation reference.
- `assets/` — images, animations, and sound effects required by the source code.

`Navigation/AGENTS.md` contains more specific navigation guidance. Follow it together with this file.

## Important project conventions

### File and folder structure

Keep responsibilities separated:

- Put screen-specific UI in `Screens/`.
- Put reusable visual components and board pieces in `Components/`.
- Keep game rules and mutable game state in `redux/`.
- Keep static board definitions and utility functions in `helpers/`.
- Keep shared constants in `constants/`.
- Keep navigation dispatch helpers in `helpers/NavigationUtil.js`.
- Keep media under `assets/` and update every static `require()` when an asset is renamed.

Do not introduce a second navigation container, Redux store, or navigation ref.

### Navigation

The intended flow is:

1. `SplashScreen`
2. `HomeScreen`
3. `LudoBoardScreen`

Use the existing navigation ref and `helpers/NavigationUtil.js` for navigation outside screen components.

When changing a route name, update every caller and the screen registration together.

### Redux and game state

The `game` slice is the source of truth for:

- current player turn/chance
- dice state
- player pieces
- selectable piles/cells
- fireworks/win state
- game reset and movement state

Keep state property names consistent across:

- `redux/reducers/initialState.js`
- `redux/reducers/gameSlice.js`
- `redux/reducers/gameSelector.js`
- components using `useSelector`
- actions dispatched from `gameAction.js`

Do not create duplicate state fields because of spelling differences.

Use the established action creators from `gameSlice.js`; do not invent near-duplicate action names.

### Ludo board rules

Board positions and special locations are defined in `helpers/PlotData.js`.

Treat these arrays as game-rule data:

- `SafeSpots`
- `StarSpots`
- `ArrowSpot`
- `turningPoints`
- `victoryStart`
- `startingPoints`
- `Plot1Data` through `Plot4Data`

Before changing a board position, verify its effect on movement, collision, safe spots, and victory logic.

Do not change gameplay behavior merely while performing spelling, formatting, or refactoring work unless the task explicitly asks for it.

### Assets

Components currently reference images, animations, and sounds using static React Native `require()` calls.

When adding or renaming an asset:

1. Update all source references.
2. Preserve the expected directory/category.
3. Check filename casing exactly.
4. Confirm the asset exists before considering the change complete.

Expected asset categories include:

- `assets/images/`
- `assets/images/dice/`
- `assets/images/piles/`
- `assets/animation/`
- `assets/sfx/`

If assets are unavailable, report the missing assets instead of replacing them with guessed files.

### TypeScript / JavaScript

The project contains both `.js` and `.tsx` source files.

- Preserve the existing language of a file unless migration is explicitly requested.
- Avoid adding TypeScript-only imports to JavaScript files.
- Keep imports used and remove clearly unused imports when touching a file.
- Prefer existing project patterns over introducing new libraries.

### Styling

Use React Native `StyleSheet.create()` for component styles.

Preserve the existing visual design unless the task is specifically about UI changes.

Be careful with React Native property names such as:

- `justifyContent`
- `alignItems`
- `flexDirection`
- `transform`

A typo in a style property can silently produce incorrect UI.

## Safe editing rules for coding agents

### For spelling/cleanup tasks

When asked to fix spelling:

- Correct identifiers consistently across declarations, selectors, reducers, and consumers.
- Do not change game rules.
- Do not rename unrelated public APIs.
- Search the entire repository after renaming to ensure the old spelling is gone.
- Check imports and exports after each identifier rename.

Examples of consistency-sensitive names include:

- `chancePlayer`
- `fireworks`
- `unfreezeDice`

### For bug fixes

Before changing behavior:

1. Identify the failing path.
2. Trace the relevant screen/component → action → reducer → selector flow.
3. Make the smallest safe change.
4. Check for related references.
5. Run static searches/tests/build checks available in the repository.

Avoid broad rewrites of gameplay code unless specifically requested.

## Validation checklist

After making changes, check at minimum:

1. No broken relative imports.
2. No duplicate imports/declarations.
3. No references to renamed identifiers using the old spelling.
4. Every static asset `require()` points to an existing file.
5. Redux action names match their definitions.
6. Redux state property names match selectors and components.
7. Navigation route names match registrations and callers.
8. No obvious JavaScript/TypeScript syntax errors.
9. No accidental changes to Ludo movement rules.
10. If a complete React Native project is available, run its configured lint/typecheck/tests/build commands.

If project scaffolding or assets are missing, state that limitation clearly rather than claiming the app was successfully built.

## Current repository limitations

This source archive may be incomplete. In particular, a source-only archive can lack:

- `package.json`
- native Android/iOS projects
- Babel/Metro configuration
- image/animation/sound assets

Do not assume missing infrastructure is intentionally absent. Distinguish source-code fixes from project-packaging fixes.

## Change reporting

When finishing a task, report:

- files changed
- what changed
- whether behavior was intentionally changed
- validation performed
- any remaining blockers, especially missing dependencies/assets/project files

Keep the report concise and factual.
