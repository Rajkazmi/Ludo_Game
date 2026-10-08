# Ludo Game

A four-player Ludo game built with React Native. Play a local pass-and-play game on one device, roll animated dice, move pieces around the board, and continue a saved game later.

## Features

- Four-player local gameplay: red, green, yellow, and blue.
- Dice rolls, piece movement, captures, safe/star squares, and home-lane progress.
- Dice, movement, and game-event animations and sound effects.
- Resume a saved game from the home screen. Game state is stored locally on the device.
- Android and iOS native project folders are included.

The **VS CPU** and **2 VS 2** buttons are placeholders and are not playable modes yet. Online multiplayer is not included.

## How to play

1. Start the app and choose **NEW GAME**. Choose **RESUME** to continue a saved game when that option is available.
2. Players take turns rolling the die. A piece in its base can enter the board on a six; select a highlighted piece to make a move.
3. Select a highlighted on-board piece to move it by the number rolled. A roll that would move a piece past home is not a legal move.
4. Rolling a six grants another roll. Landing on an opponent on an unprotected square sends that opponent's piece back to its base. Safe and star squares protect pieces from capture.
5. Move all four of your pieces home to win.

## Requirements

Install the tools for the platform you want to build:

### Required for JavaScript dependencies

- [Node.js](https://nodejs.org/) **22.11.0 or newer** (required by `package.json`).
- npm (included with Node.js).

### Required for Android

- [Android Studio](https://developer.android.com/studio), including the Android SDK and an Android Virtual Device (emulator), or a physical Android device with USB debugging enabled.
- Android SDK Platform **36** and Android SDK Build-Tools **36.0.0**.
- Android NDK **27.1.12297006**.
- **JDK 17**.
- Android SDK Platform-Tools (`adb`).

In Android Studio, install the listed SDK components from **Tools → SDK Manager**. Create and start an emulator from **Tools → Device Manager**. The project uses the Gradle wrapper, so a separate Gradle installation is not required. Gradle downloads its distribution and build dependencies on the first build.

Make sure `ANDROID_HOME` points to your Android SDK installation and that its `platform-tools` directory is on your `PATH`. The common SDK location is:

- Windows: `%LOCALAPPDATA%\Android\Sdk`
- macOS: `$HOME/Library/Android/sdk`
- Linux: `$HOME/Android/Sdk`

### Required for iOS

- macOS and [Xcode](https://developer.apple.com/xcode/).
- Ruby and Bundler for the repository's `Gemfile`, plus CocoaPods (installed through Bundler below).
- An iOS Simulator supplied by Xcode or a configured iOS device.

iOS builds cannot be run on Windows or Linux.

## Set up and run on Android

Run these commands from the repository root. The first install uses the committed npm lockfile and also runs the project's `patch-package` post-install script.

```sh
npm ci
```

Start an Android emulator in Android Studio, or connect an Android phone with USB debugging enabled. Verify that Android can see the device:

```sh
adb devices
```

Start Metro in one terminal:

```sh
npm start
```

In a second terminal at the repository root, build, install, and launch the app:

```sh
npm run android
```

Keep Metro running while using a debug build. If prompted on a physical device, allow USB debugging. For a USB-connected device, you can forward Metro's port with:

```sh
adb reverse tcp:8081 tcp:8081
```

### Build a debug APK

To build without installing or launching the app, run the Gradle wrapper from the repository root:

**Windows PowerShell**

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

**macOS or Linux**

```sh
cd android
./gradlew :app:assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. This is a **debug** build, signed with the development debug key; it is not a Play Store release.

## Set up and run on iOS

On a Mac, install JavaScript dependencies first:

```sh
npm ci
```

Then install the CocoaPods dependencies using the repository's Bundler setup:

```sh
bundle install
cd ios
bundle exec pod install
cd ..
```

Open an iOS Simulator in Xcode, then start Metro in one terminal:

```sh
npm start
```

From a second terminal at the repository root, build and launch the app:

```sh
npm run ios
```

## Useful commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the exact JavaScript dependencies from `package-lock.json`. |
| `npm start` | Start the Metro JavaScript bundler. |
| `npm run android` | Build, install, and launch the Android app. |
| `npm run ios` | Build, install, and launch the iOS app (macOS only). |
| `npm run lint` | Run ESLint on the project. |
| `npm test -- --runInBand` | Run the Jest test suite serially. |

## Project layout

```text
Src/
  Components/       Shared UI, dice, pieces, and board paths
  Navigation/       Navigation container and screen registration
  Screens/          Splash, home, and game-board screens
  assets/           Images, Lottie animations, and sound effects
  constants/        Shared colors and screen-scaling values
  helpers/          Board routes, navigation, icons, and sound helpers
  redux/            Game state, reducers, selectors, and persistence
android/            Android application and Gradle wrapper
ios/                iOS application and CocoaPods configuration
__tests__/          Jest tests
```

Gameplay state and board-rule data live in `Src/redux/` and `Src/helpers/PlotData.js`. Keep the existing board definitions and reducer/state conventions in mind when changing game rules.

## Troubleshooting

- **`Unsupported class file major version` or Java/Gradle errors:** Verify that `java -version` reports JDK 17 and that Android Studio/Gradle is using that JDK.
- **Android SDK or NDK not found:** Install the required SDK Platform, Build-Tools, and NDK versions in Android Studio's SDK Manager; check `ANDROID_HOME` and the project's `android/local.properties` SDK path.
- **No device is listed:** Start an emulator or reconnect/unlock the phone, enable USB debugging, accept its debugging prompt, and check `adb devices`.
- **The app cannot connect to Metro:** Keep `npm start` running, use the same computer/network for the emulator, and for a USB-connected device run `adb reverse tcp:8081 tcp:8081`.
- **Metro serves a stale bundle:** Stop the existing Metro process and restart it with `npm start -- --reset-cache`.
- **A native dependency changed:** Re-run `npm ci`; for iOS, also run `cd ios && bundle exec pod install` on macOS.
- **The Jest smoke test fails with an ESM transform error:** The current Jest preset may need configuration to transform the ESM entry point used by `react-redux`. This test-runner issue does not change the Android/iOS app launch commands.

## License
