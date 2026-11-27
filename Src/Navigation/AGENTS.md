# AGENTS.md — Ludo Kingdom

These instructions apply to navigation work in `Src/Navigation/` and related route flows. When that work touches other files, inspect their existing owners and follow any repository-root or more-specific `AGENTS.md` instructions that apply; resolve conflicts in favor of more-specific guidance unless it conflicts with security requirements.

## 1. Project overview

- This is a React Native Ludo game built primarily with JavaScript, with a small amount of TypeScript/TSX.
- Application source code lives under `Src/`.
- Native projects live under `android/` and `ios/`.
- The Android application ID is `com.gamegape.ludokingdom`.
- `App.js` sets up the Redux provider, persisted state, and navigation.
- Local gameplay works without an account.
- Authentication, player profiles, online rooms, and the Gapes economy use Firebase Authentication, Realtime Database, and callable Cloud Functions.
- The `functions/` directory contains trusted backend logic. It uses Node.js 22 and Firebase Functions.
- Use the Android Gradle wrapper for Android builds.

Do not assume every player is signed in or that a network connection is available. Preserve offline/local gameplay.

## 2. Architecture and code ownership

Keep each behavior in the layer that already owns it. Do not introduce a parallel implementation of an existing responsibility.

| Location | Responsibility |
|---|---|
| `Src/Screens/` | Splash, account, profile setup, home, online room/lobby, and board screens |
| `Src/Components/` | Shared UI, board paths/cells, pieces, dice, and game dialogs |
| `Src/Navigation/` | The single React Navigation container and route registrations |
| `Src/redux/` | Game, online-room, and profile state; selectors; actions; persistence |
| `Src/helpers/` | Board positions, turn progression, navigation, sound, icons, and device scaling |
| `Src/constants/` | Shared colors and device-scaling constants |
| `Src/services/` | Firebase authentication, profile, online-room, and economy client operations |
| `Src/config/` | Firebase client initialization and App Check setup |
| `Src/assets/` | Images, animations, fonts, and sound effects (dice and piles are under `images/`) |
| `functions/` | Trusted callable backend operations for profiles, online rooms/gameplay, and the Gapes economy |
| `functions/test/` | Node.js tests for Functions and related backend logic |
| `__tests__/` | React Native app and Jest tests |
| `App.js`, `index.js` | App providers, persisted Redux state, and the React Native entry point |
| Root configuration files | `package.json`, Babel/Metro/Jest/TypeScript config, Firebase config, and `database.rules.json` |
| `android/`, `ios/` | Android Gradle and iOS Xcode native projects |
| `scripts/` | Project maintenance scripts, including Android release-version handling |
| `patches/` | `patch-package` dependency patches |
| `.github/workflows/` | Android CI/release and Realtime Database rules workflows |
| `README.md` | User-facing project overview, setup, and feature notes |

This map reflects the current checkout. Verify paths and filename casing before editing; do not invent missing directories or move files just to match this document.

Key boundaries:

- Do not add a second navigation container, navigation ref, Redux store, or parallel game-state implementation.
- Reuse existing services, helpers, action creators, thunks, and selectors before introducing new abstractions.
- Avoid moving code across architectural layers unless the task requires it and the consequences are understood.
- Preserve the existing language of each file. Do not convert `.js` to TypeScript or vice versa unless explicitly requested.
- Prefer existing project patterns over introducing new libraries or state/styling systems.

## 3. Navigation

### Ownership

- `Src/Navigation/Navigation.js` owns the single `NavigationContainer`, its `NavigationRef`, and native stack route registrations.
- `Src/helpers/NavigationUtil.js` provides navigation helpers for code outside screen components.
- Use React Navigation hooks only in screens rendered inside the registered navigator.
- Keep screen-specific behavior in screens; keep route registration and navigator-level options in `Navigation.js`.

### Registered routes

The current stack registers:

- `SplashScreen`
- `LoginScreen`
- `CreateAccountScreen`
- `ProfileSetupScreen`
- `HomeScreen`
- `CreateRoomScreen`
- `JoinRoomScreen`
- `GameLobbyScreen`
- `LudoBoardScreen`

Use these route names consistently. When adding, removing, or renaming a route, update its registration, every navigation caller, and relevant tests together.

### Navigation flows and parameters

- `SplashScreen` is the initial route. It chooses a destination based on connectivity and persisted authentication/profile state.
- `HomeScreen` provides local game setup/resume and online room entry.
- `CreateRoomScreen` and `JoinRoomScreen` lead into `GameLobbyScreen`.
- Starting an online lobby replaces it with `LudoBoardScreen` and passes the room code.
- Account and profile flows use `LoginScreen`, `CreateAccountScreen`, and `ProfileSetupScreen`.
- Preserve route parameters used by existing flows, especially `mode`, `roomCode`, and startup error details.
- Do not reduce the documented route flow to a simpler flow unless the actual registered routes and product behavior have intentionally changed.

### Stack behavior

- For navigation outside a screen, use the existing `NavigationRef` and helpers in `Src/helpers/NavigationUtil.js`.
- Do not create another navigation ref or container.
- Use reset when old authentication or game screens must not remain reachable through Back. Use existing push/navigate/replace semantics when a screen should remain in the stack.
- Follow existing helper patterns for navigator readiness and back-stack checks.
- Keep headers hidden and existing transitions unless the requested UX change requires otherwise.
- Do not dispatch navigation actions for unregistered routes or after a screen has unmounted.

After navigation changes, verify route registrations, callers, route parameters, and back-stack behavior together, then run focused navigation tests and the relevant app test suite.

## 4. Redux and game state

- The root Redux state has `game`, `online`, and `profile` slices.
- `Src/redux/reducers/gameSlice.js` is the source of truth for local player pieces, turn/chance, dice, selections, active players, computer players, fireworks/win state, reset, and movement state.
- Local `game` state is persisted through Redux Persist and MMKV.
- Online-room and profile state are not on the persistence whitelist.

Rules:

- Use existing action creators and thunks in `gameSlice.js` and `gameAction.js`.
- Keep state names consistent with `initialState.js`, `gameSlice.js`, `gameSelector.js`, and their component consumers.
- Reuse existing selectors instead of duplicating state derivation in components.
- Keep shared turn progression in `Src/helpers/GameTurn.js`.
- Do not create duplicate state fields because of spelling differences or invent near-duplicate action names.
- Do not store a second copy of authoritative state in component state unless it is strictly temporary UI state.
- When changing persisted state, consider existing on-device persisted data and the effects of changing the persistence shape or whitelist. Do not casually rename or remove persisted fields.

When correcting a state-property or identifier spelling, update declarations, reducers, selectors, actions, imports/exports, and every consumer consistently. Search the repository for the old spelling after the change. Do not rename unrelated public APIs.

## 5. Ludo board and gameplay rules

- Board routes and special positions are defined in `Src/helpers/PlotData.js`.
- Important definitions include `SafeSpots`, `StarSpots`, `ArrowSpot`, `turningPoints`, `victoryStart`, `startingPoints`, and `Plot1Data` through `Plot4Data`.
- Before changing a board position or movement rule, trace its effects on piece travel, captures/collisions, protected squares, turn progression, and winning.
- Check both human and computer-player behavior where relevant.
- Do not alter gameplay rules during unrelated spelling, formatting, UI, cleanup, or refactoring work.
- Preserve existing local gameplay behavior unless the task explicitly requests a gameplay change.

## 6. Online features and Firebase security

### Client/backend boundary

- The client uses `Src/services/OnlineGameService.js` for room operations and subscriptions.
- Online match actions are submitted to callable Cloud Functions.
- Realtime Database subscriptions deliver room updates.
- The Functions backend owns validation and authoritative room/game writes.
- Profile operations are handled by trusted backend functions in `functions/`.

### Security requirements

Act as a security reviewer on every change, not only changes labelled security-related. Check the relevant items below:

- Authentication and authorization boundaries.
- Input validation and malformed/untrusted client data.
- Data ownership and room/player access.
- Realtime Database rules in `database.rules.json`.
- Callable Function validation and authoritative writes.
- App Check assumptions and enforcement.
- Secret handling, dependency/configuration risks, and unintended information exposure.

Preserve authentication, authorization, input validation, and data-ownership checks when changing online behavior. Keep `database.rules.json` consistent with the backend design.

- Do not move trusted game or profile writes into the mobile client.
- Do not weaken Realtime Database rules, authentication, App Check, or callable-Function protections to work around a client-side failure.
- Treat all client input and client-provided room/player data as untrusted on the backend. Validate it in trusted backend code before accepting state changes.
- Never put passwords, private keys, service-account JSON, upload credentials, or App Check debug tokens in source control.
- Firebase web configuration and native provider identifiers are client configuration; this does not make server credentials or privileged tokens safe to expose.
- Do not log passwords, tokens, private credentials, or other sensitive authentication data.

When changing a callable Function, inspect its client caller, validation, authorization, database writes, and tests. When changing database access, review the corresponding security rules as well. Add or update tests for security-sensitive behavior and report unresolved risks explicitly.

## 7. UI, styling, and assets

### UI and styling

- Preserve the current visual design unless the task explicitly requests a UI change.
- Do not change unrelated game behavior while editing presentation.
- Follow the styling approach already used in the affected component. Use `StyleSheet.create()` where that is the established project convention; do not rewrite existing styling systems as unrelated cleanup.
- Be careful with React Native property names such as `justifyContent`, `alignItems`, `flexDirection`, and `transform`; style-property typos can silently produce incorrect UI.
- Consider Android and iOS behavior when changing shared React Native code.
- Respect existing device scaling, safe-area, and platform-specific patterns rather than introducing competing layout utilities.

### Assets

- Use existing static React Native `require()` references for assets.
- Keep media in the existing `Src/assets/` categories: `images/` (including `images/dice/` and `images/piles/`), `animation/`, `fonts/`, and `sfx/`. Preserve the directory and filename conventions present in the checkout.
- When adding, renaming, or removing an asset:
  1. Update every source reference.
  2. Preserve the expected directory/category.
  3. Check filename casing exactly.
  4. Confirm the asset exists before considering the change complete.
- Do not replace unavailable assets with guessed filenames or placeholder assets unless the task explicitly requests placeholders. Report missing assets.

## 8. Required development workflow

For behavior changes, use test-driven development where practical:

1. Identify the affected behavior and its owner.
2. Add or update a focused test before implementation.
3. Run the test and confirm it fails for the expected reason. If it cannot be run first, explain why.
4. Implement the smallest safe change.
5. Rerun the focused test and add/update unit tests for changed logic.
6. Add/run integration tests for affected boundaries where the project has suitable infrastructure, such as app-to-service, Firebase client-to-Function, Function-to-Realtime Database, or Android native integration.
7. Run relevant broader checks before finishing.

For visual-only changes, use appropriate component/rendering checks where available; do not invent behavior tests that cannot meaningfully validate the change.

### Debugging and safe editing

Before editing:

- Read the relevant screen/component and trace the existing caller-to-service/state flow.
- Identify the source of truth and the layer responsible for the behavior.
- Check related helpers, selectors, route parameters, backend functions, database rules, assets, and tests as applicable.

While editing:

- Prefer the smallest maintainable change that solves the requested problem.
- Preserve existing public interfaces, state shapes, route names, and backend contracts unless the task requires changing them.
- Handle loading, error, empty, offline, and unauthenticated states where relevant.
- Avoid swallowing errors or reporting success before an operation has actually succeeded.
- Do not add placeholder implementations, fake success responses, or hard-coded production data to hide failures.
- Do not change dependencies, build configuration, database schema, security rules, or persisted state without explaining why the change is needed.
- Avoid broad rewrites of gameplay code unless specifically requested.

For spelling/cleanup tasks, correct identifiers consistently, avoid changing game rules or unrelated public APIs, and search the entire repository for old spellings. Examples of consistency-sensitive names mentioned in existing project guidance include `chancePlayer`, `fireworks`, and `unfreezeDice`; verify that each identifier exists in the current checkout before changing it.

## 9. Adversarial testing and findings

After the requested feature's normal tests pass, attempt relevant negative, boundary, malformed-input, failure, retry, and abuse-case tests. Keep fault injection and experiments in tests, emulators, or disposable staging environments; do not intentionally leave production code broken.

Do not silently expand the requested implementation to fix unrelated defects discovered during this review. Report each reproducible unrelated issue separately as a numbered finding, including:

- Impact/severity.
- The test or scenario that exposed it.
- Recommended remediation.

If an adversarial test exposes a defect directly caused by the requested change, fix it before finishing where possible. Clearly distinguish that fix from unrelated findings.

## 10. Load and scale simulation

For each developed feature, plan a repeatable simulation with at least 1,000 generated users or feature scenarios, using safe local test infrastructure:

- For backend or online features, use at least 1,000 simulated clients only when the available local emulator or disposable staging setup supports concurrent load.
- For local-only game or UI features, use at least 1,000 deterministic or seeded scenarios where such simulation meaningfully exercises the changed behavior.
- Never send load tests to production or third-party systems without explicit authorization.
- Prefer the project's existing test and emulator infrastructure.

If the change is too small for a meaningful scale simulation, or the available tooling cannot support the required run, do not fabricate a result. Add or describe a safe, runnable test approach where useful and clearly report that the 1,000-case or concurrent-client run was not completed. Do not claim unrun tests passed.

## 11. Tests and validation

Run the most focused relevant test first, then broader checks when appropriate.

Available repository commands:

```bash
npm run lint
npm test -- --runInBand --ci
npm test --prefix functions
```

Android debug build:

```powershell
# From the android/ directory on Windows
.\gradlew.bat :app:assembleDebug
```

```bash
# From the android/ directory on macOS/Linux
./gradlew :app:assembleDebug
```

Android environment currently documented by the project:

- JDK 17
- Android SDK Platform/Build Tools 36
- NDK `27.1.12297006`

Validation checklist, as relevant to the change:

1. No broken relative imports or duplicate declarations.
2. No references to renamed identifiers using the old spelling.
3. Every static asset `require()` points to an existing file with exact casing.
4. Redux action names match their definitions.
5. Redux state property names match initial state, reducers, selectors, and components.
6. Navigation route names and parameters match registrations and callers.
7. No obvious JavaScript/TypeScript syntax errors.
8. No accidental changes to Ludo movement, capture, safe-spot, turn, or victory rules.
9. Security-sensitive behavior has appropriate tests and review.
10. Relevant unit, integration, lint, Functions, and platform build checks have been run where applicable.

Run an Android build when the change affects Android/native integration or when the task asks for a build. An Android build does not prove the app launched: confirm a device or emulator is available and the app actually launches before reporting launch success.

If project scaffolding, dependencies, native projects, or assets are missing, state that limitation clearly rather than claiming the app was successfully built. A source-only archive may lack `package.json`, Android/iOS projects, Babel/Metro configuration, or media assets; distinguish source-code validation from full-project build validation.

If a check cannot be run, state which check was skipped and why. Never report a test, build, simulation, or launch as successful unless it completed successfully.

## 12. Git and delivery

- Do not commit, push, create releases, or modify remote branches unless the user explicitly asks.
- Do not discard, overwrite, or reformat unrelated user changes.
- Before finishing, review changed files and remove accidental debug code, temporary files, and unused imports introduced by the change.
- Report files changed, what changed, whether behavior was intentionally changed, validation performed, and remaining blockers or unverified behavior.
- Keep the final report concise and factual.
