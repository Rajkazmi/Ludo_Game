# Project-Wide Agent Instructions

These requirements apply to all development work in this repository. Follow them together with any more-specific `AGENTS.md` files in affected directories.

## Required Development Workflow

1. Use test-driven development for behavior changes: add or update a focused test first, run it to confirm it fails for the expected reason, implement the smallest change, and rerun it.
2. Add and run unit tests for changed logic.
3. Add and run integration tests for affected boundaries, such as app-to-service, Firebase client-to-Function, Function-to-Realtime Database, or Android native integration. Use existing emulators and test helpers where possible.
4. Run relevant project checks before finishing, including lint, app tests, Functions tests, and an Android build when the change affects those areas. Report any check that could not be run and why.

## Security Review

Act as a project security reviewer on every change, not only changes labeled security-related. Check authentication and authorization boundaries, input validation, data ownership, Realtime Database rules, callable Function behavior, App Check assumptions, secret handling, dependency/configuration risks, and unintended information exposure as relevant to the change. Add or update tests for security-sensitive behavior and report unresolved risks explicitly.

## Adversarial Testing and Findings

After the requested feature is implemented and its normal tests pass, attempt to break it through negative, boundary, malformed-input, failure, retry, and abuse-case tests. Keep fault injection and experiments in tests, emulators, or disposable staging environments; do not intentionally leave production code broken.

Do not silently fix defects discovered during this adversarial review unless the user asks for those fixes. Report each reproducible issue and its recommended remediation as a numbered list, including impact and the test or scenario that exposed it. Keep discovered defects separate from the requested feature implementation.

## Load and Scale Simulation

For each developed feature, run a repeatable simulation with at least 1,000 generated users or feature scenarios. For backend or online features, use at least 1,000 simulated clients when the available local emulator or disposable staging setup supports concurrent load. For local-only game or UI features, simulate at least 1,000 deterministic or seeded scenarios instead of claiming concurrent users. Never send load tests to production or third-party systems without explicit authorization.

Use the project's existing test and emulator infrastructure where possible. If the required scale cannot be tested with available tooling, add or describe a runnable safe test approach and clearly report that the 1,000-case or concurrent-user run was not completed; do not claim unrun tests passed.