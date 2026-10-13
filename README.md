# Ludo Game

A four-player Ludo game built with React Native. Play a local pass-and-play game on one device, roll animated dice, move pieces around the board, and continue a saved game later.

## Features

- Four-player local gameplay: red, green, yellow, and blue.
- Dice rolls, piece movement, captures, safe/star squares, and home-lane progress.
- Dice, movement, and game-event animations and sound effects.
- Resume a saved game from the home screen. Game state is stored locally on the device.
- On startup, offline devices go directly to local play. Online users sign in with Google or Facebook before entering the home screen; an existing saved sign-in is restored automatically.
- The login screen also offers **Play Offline**, which starts a fresh local game directly on the Ludo board without signing in.
- Android and iOS native project folders are included.

**Create Room** and **Join Room** start a Firebase Realtime Database match for 2–4 signed-in players. The room host's app coordinates dice rolls and moves, so the host must stay online for the full match. The **VS CPU** and **2 VS 2** modes are not included.

## Configure online sign-in

The sign-in gate uses Firebase Authentication, Google Sign-In, Facebook Login, and Firebase Realtime Database. These steps are required before an online sign-in can work. Without Firebase and provider configuration, devices without internet can still open the game in offline mode; an online device will show the login screen with a configuration message.

After successful sign-in, **NEW GAME** starts local pass-and-play. Use **CREATE ROOM** or **JOIN ROOM** for an online match. The host can start after at least two players have joined, up to four players total.

The Google and Facebook buttons remain tappable when configuration is incomplete so the app can show the exact missing setup instead of silently ignoring taps. Configure Firebase plus the selected provider to complete sign-in; configuring one provider is independent of the other.

### 1. Create and configure Firebase

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Register an Android app with application ID `com.gamegape.ludokingdom` and an iOS app with the bundle identifier configured by the Xcode project.
3. In **Authentication → Sign-in method**, enable **Google** and **Facebook**.
4. In **Realtime Database**, create a database and copy the database URL for the app configuration.
5. Register the Firebase web app (used by the React Native Firebase JavaScript SDK) and copy its API key, auth domain, project ID, and app ID.
6. In **Realtime Database → Rules**, publish the rules from [`database.rules.json`](./database.rules.json). They restrict each signed-in user to their own profile, let room hosts coordinate the match, and let signed-in room members submit their own actions. Do not use open test rules in production.

### 2. Configure Google Sign-In

1. In Firebase **Project settings → Your apps**, add the Android SHA-1 signing fingerprint for each build type you use. From the repository root, run `cd android` and then `.\gradlew.bat signingReport` on Windows, or `./gradlew signingReport` on macOS/Linux. Register the debug fingerprint for development and the release fingerprint before shipping.
2. In Google Cloud Console, configure the OAuth clients for the same Firebase project and package/bundle identifiers. Set up the Android OAuth client with its SHA-1, and create a **Web application** OAuth client.
3. Use the Web client ID in `googleWebClientId` in [`Src/config/firebase.js`](./Src/config/firebase.js). Set `googleIosClientId` there to the iOS OAuth client ID. Add the reversed iOS client ID URL scheme from Google Cloud to `CFBundleURLSchemes` in [`ios/LudoGame/Info.plist`](./ios/LudoGame/Info.plist) in place of `com.googleusercontent.apps.REPLACE_WITH_GOOGLE_IOS_CLIENT_ID_PREFIX`.

### 3. Configure Facebook Login

1. Create a Facebook app in [Meta for Developers](https://developers.facebook.com/) and enable Facebook Login for Android and iOS.
2. Add the Android package name `com.gamegape.ludokingdom`, the Android launch activity, and the debug/release key hashes required by Meta. Add the iOS bundle identifier and enable the iOS login redirect.
3. Copy the Facebook App ID and Client Token into the marked values in:
   - [`Src/config/firebase.js`](./Src/config/firebase.js): `facebookAppId`
   - [`android/app/src/main/res/values/strings.xml`](./android/app/src/main/res/values/strings.xml): Facebook app ID, Client Token, and `fb` login scheme
   - [`ios/LudoGame/Info.plist`](./ios/LudoGame/Info.plist): Facebook app ID, Client Token, and `fb` URL scheme
4. In Firebase Authentication's Facebook provider settings, enter the Facebook App ID and App Secret from Meta, then add Firebase's displayed OAuth redirect URI to the Facebook Login configuration.
5. Facebook email access is required. If a Facebook account does not return an email address, sign-in is rejected and the login screen offers the error; users can try Google instead.

### 4. Fill in Firebase app settings

Replace the `REPLACE_WITH_...` values in [`Src/config/firebase.js`](./Src/config/firebase.js) with the Firebase project configuration, database URL, Google OAuth client IDs, and Facebook App ID. The Firebase web API key and OAuth client IDs are app configuration values, **not server credentials**. Never put a Firebase Admin SDK private key, Google client secret, or Facebook App Secret in the mobile app.

The only profile data this app writes under `users/<Firebase-Auth-uid>` is:

```json
{
  "email": "player@example.com"
}
```

Firebase Authentication itself necessarily manages the account UID and provider authentication records; those are separate from the app's profile record. The app does not save a display name, profile photo, or provider access token in that profile record. Online rooms separately store room codes, player display names/UIDs, and the active game state.

This version uses the host's signed-in app as the match coordinator; it is not a trusted server. If the host disconnects or closes the app, authoritative turns stop. For production, publish the room rules in [`database.rules.json`](./database.rules.json) to the same Realtime Database configured in [`Src/config/firebase.js`](./Src/config/firebase.js).

After changing native Facebook settings or adding native packages, rebuild the application. For iOS, run `cd ios && bundle exec pod install` on macOS before rebuilding.

## How to play

1. Start the app and choose **NEW GAME**. Choose **RESUME** to continue a saved game when that option is available.
2. Players take turns rolling the die. A piece in its base can enter the board on a six; select a highlighted piece to make a move.
3. Select a highlighted on-board piece to move it by the number rolled. A roll that would move a piece past home is not a legal move.
4. Rolling a six grants another roll. Landing on an opponent on an unprotected square sends that opponent's piece back to its base. Safe and star squares protect pieces from capture.
5. Move all four of your pieces home to win.

## Automated checks

GitHub Actions runs the Android CI workflow for pushes to any branch and pull requests targeting any branch. It installs the locked npm dependencies, runs lint and Jest tests, builds a debug APK, and uploads that APK as a workflow artifact. These checks run after a commit is pushed to GitHub; they do not push local changes automatically.

The workflow validates the app but does not deploy Firebase changes or publish to Google Play. Keep Firebase rules and backend code in this repository with the app. Use GitHub Actions secrets and protected environments for Firebase deployment credentials or Play Console publishing credentials; never commit service-account keys or release signing keys. For Play Store releases, publish from a deliberate release/tag workflow after checks pass, rather than publishing every development commit.

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

## GitHub checks

The GitHub Actions workflow in [`.github/workflows/android-ci.yml`](./.github/workflows/android-ci.yml) runs on pull requests and pushes to `main`. It installs dependencies, runs lint and Jest, builds the Android debug APK, and stores that APK as a downloadable workflow artifact. These checks validate development builds; they do not sign or publish a Play Store release.

Before opening a pull request, run `npm ci`, `npm run lint`, `npm test -- --runInBand`, and `.\gradlew.bat :app:assembleDebug` from the `android/` directory on Windows. Merge only after the required GitHub checks pass.

## Android release signing

Debug builds use the Android debug key and are not suitable for Play Store uploads. Release builds must use a private upload key; the Gradle release configuration does not fall back to the debug key.

Keep the upload keystore and its passwords out of Git. The root `.gitignore` excludes `*.jks` and `keystore.properties` files in any folder. Create `android/keystore.properties` locally with:

```properties
storeFile=../upload-keystore.jks
storePassword=YOUR_UPLOAD_KEYSTORE_PASSWORD
keyAlias=YOUR_UPLOAD_KEY_ALIAS
keyPassword=YOUR_UPLOAD_KEY_PASSWORD
```

The `storeFile` path is relative to the `android/` directory. Store the key and passwords in a secure password manager and keep a protected backup. Never commit the keystore or properties file. If the upload key is unavailable or lost, stop before creating a release and follow the Play Console upload-key reset process.

With the properties file and keystore in place, validate and build the Play bundle from PowerShell:

```powershell
Push-Location android
.\gradlew.bat :app:bundleRelease
Pop-Location
```

The bundle is written to `android/app/build/outputs/bundle/release/app-release.aab`. Keep `versionCode` in `android/app/build.gradle` increasing for each Play Console upload. Configure Play App Signing in Play Console; the upload key signs the bundle you submit, while Google manages the app-signing key used for distribution.

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

## License

No `LICENSE` file is currently included. Add a license before redistributing this project or its contents.
