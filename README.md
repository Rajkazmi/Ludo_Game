# Ludo Game

Ludo Game is a React Native board game for Android and iOS. It supports offline games on one device and online matches between signed-in players.

## Features

- **Local play:** start a two-player game, play against the computer, or choose a two-, three-, or four-player game on one device.
- **Ludo gameplay:** roll dice, bring pieces onto the board, move around the track, capture unprotected opposing pieces, and race to the home lane.
- **Board protections:** safe spaces and star squares protect pieces from capture.
- **Computer opponent:** the computer takes turns automatically in a single-player game.
- **Saved game:** local game progress is stored on the device and can be resumed later.
- **Online multiplayer:** create a room or join one with a room code; the host manages player requests and starts the match.
- **Player accounts and profiles:** online players can sign in and maintain a profile associated with their account.
- **Gapes economy:** signed-in players receive a starting balance, passive regeneration, daily login rewards, and server-validated cosmetic redemptions.
- **Android Gapes purchases:** Google Play consumable packages are credited only after server-side purchase verification.
- **Game presentation:** animated dice and board actions, sound effects, and win celebrations.

## Playing

Choose **NEW GAME** to select a local game mode. In a turn, roll the die and select an available piece to move. A six can bring a piece out of its base and grants another roll. Pieces cannot move past the end of the home track. Landing on an opponent on an unprotected square sends that piece back to its base. The first player to bring all four pieces home wins.

Use **RESUME** to continue a saved local game. For multiplayer, sign in, create or join a room, and wait in the lobby until the host starts the match.

## Gapes economy setup

The Gapes balance and transaction ledger are stored under `economy/{uid}` in Realtime Database and can only be changed by the authenticated `economyCommand` callable. The Home screen initializes the account with 100 Gapes; the balance regenerates by 20 every 12 hours. Daily rewards are claimable once per UTC day. Example redemption items and the 15-Gapes match-fee callable are defined in `functions/economy.js`.

Android purchase products use the placeholder IDs `gapes_099` (1,000 Gapes) and `gapes_499` (10,000 Gapes). Create matching one-time consumable products in Google Play Console, set their store prices, and keep IDs and amounts in sync with `Src/services/economyService.js` and `functions/economy.js`. Before accepting payments, grant the deployed Cloud Functions runtime service account access to the Google Play Android Publisher API for this app. Purchases remain unavailable if Play has no matching product, and balances are not credited unless the backend verifies the purchase. Do not add service-account keys to the app or repository.

## Project structure

- `App.js` — app bootstrap, providers, and persisted Redux state.
- `Src/Screens/` — splash, account, profile, home, lobby, and board screens.
- `Src/Components/` — reusable interface, dice, pieces, board paths, and game dialogs.
- `Src/Navigation/` — the React Navigation container and registered screens.
- `Src/redux/` — game, online-room, and profile state; local game-state persistence.
- `Src/helpers/` — board data, turn logic, navigation helpers, and sound utilities.
- `Src/services/` — authentication, profiles, online-room, and economy client operations.
- `Src/config/` — Firebase client and App Check initialization.
- `functions/` — trusted Firebase Cloud Functions for online room actions, match rules, profile operations, and Gapes economy.
- `database.rules.json` — Realtime Database access rules.
- `android/` and `ios/` — native mobile application projects.
- `__tests__/` and `functions/test/` — app and backend tests.
