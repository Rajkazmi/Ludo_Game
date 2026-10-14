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

**Create Room** and **Join Room** start a Firebase Realtime Database match for 2–4 signed-in players. Firebase Cloud Functions validate room operations, generate dice rolls, enforce turns and piece movement, and write the authoritative match state. Players receive state updates through Realtime Database. The **VS CPU** and **2 VS 2** modes are not included.

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
6. Keep the Realtime Database rules from [`database.rules.json`](./database.rules.json); the deployment workflow publishes them in its `database-rules` stage after its checks pass. Client devices can read permitted room data but cannot write match state directly.

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

Verify the values in [`Src/config/firebase.js`](./Src/config/firebase.js) match the Firebase project, database URL, Google OAuth clients, and Facebook app used for this release. The Firebase web API key and OAuth client IDs are app configuration values, **not server credentials**. Never put a Firebase Admin SDK private key, Google client secret, or Facebook App Secret in the mobile app.

The only profile data this app writes under `users/<Firebase-Auth-uid>` is:

```json
{
  "email": "player@example.com"
}
```

Firebase Authentication itself necessarily manages the account UID and provider authentication records; those are separate from the app's profile record. The app does not save a display name, profile photo, or provider access token in that profile record. Online rooms separately store room codes, player display names/UIDs, and the active game state.

Cloud Functions are the trusted coordinator for online matches; the host remains the room owner but no longer validates turns or writes game state from their device. Deploy the functions first, roll out and verify the updated app, then lock direct database writes as described below.

After changing native Facebook settings or adding native packages, rebuild the application. For iOS, run `cd ios && bundle exec pod install` on macOS before rebuilding.

## How to play

1. Start the app and choose **NEW GAME**. Choose **RESUME** to continue a saved game when that option is available.
2. Players take turns rolling the die. A piece in its base can enter the board on a six; select a highlighted piece to make a move.
3. Select a highlighted on-board piece to move it by the number rolled. A roll that would move a piece past home is not a legal move.
4. Rolling a six grants another roll. Landing on an opponent on an unprotected square sends that opponent's piece back to its base. Safe and star squares protect pieces from capture.
5. Move all four of your pieces home to win.

## Automated checks

GitHub Actions runs Android CI for pushes to any branch and pull requests targeting any branch. It installs the locked npm dependencies, runs lint and Jest tests, validates Firebase rules, builds a debug APK, and uploads that APK as a workflow artifact. These checks run after a commit is pushed to GitHub; they do not push local changes automatically.

Keep Firebase rules and backend code in this repository with the app so each change can be reviewed and tested together. The `functions/` folder contains callable Cloud Functions and server-side game rules; focused game-rule tests run in CI. Firebase deployment and Google Play publishing are separate, deliberate release actions; neither happens automatically on every code commit.

## Deploy Firebase backend

[`firebase.json`](./firebase.json) configures Firebase CLI to deploy Cloud Functions and [`database.rules.json`](./database.rules.json). The **Firebase backend deployment** GitHub Actions workflow is manually triggered, only deploys from `main`, requires explicit confirmation, and runs lint and tests before deployment. It uses Google Cloud Workload Identity Federation (OIDC), so no long-lived service-account key is stored in GitHub or the repository. Cloud Functions run in `us-central1`; configure the project's Realtime Database URL in the deployment environment.

Before using the workflow:

1. Confirm the Firebase project is the intended production project, enable **Realtime Database**, and copy its exact database URL.
2. Upgrade the Firebase project to the **Blaze (pay-as-you-go) plan**. Deploying Cloud Functions requires billing; configure Google Cloud budget alerts.
3. Enable the Cloud Functions, Cloud Build, Artifact Registry, Cloud Run, Eventarc, and Service Usage APIs in Google Cloud if needed.
4. Create a deployment service account and configure Workload Identity Federation for this GitHub repository. Restrict the identity provider to `Rajkazmi/Ludo_Game` and the `main` branch. Grant the deployment service account the permissions needed to deploy Functions and Realtime Database rules. Ensure the Cloud Functions runtime service account separately has Realtime Database access.
5. In GitHub repository settings, create an environment named `firebase-production` and configure required reviewers/deployment protection.
6. Add these environment variables to `firebase-production`:
   - `FIREBASE_PROJECT_ID`: the Firebase project ID to deploy to.
   - `FIREBASE_DATABASE_URL`: the Realtime Database URL from step 1; it must match [`Src/config/firebase.js`](./Src/config/firebase.js).
7. Add these environment secrets to `firebase-production`:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`: the full workload identity provider resource name.
   - `GCP_SERVICE_ACCOUNT`: the deployment service-account email.
8. Protect `main` so changes are merged through reviewed pull requests and CI must pass. Pushes to other branches run checks but cannot deploy Firebase or Play releases.

Deploy in two stages to avoid breaking the currently released client:

1. After merging, run **Actions → Firebase backend deployment → Run workflow** on `main`, select `functions`, and confirm. This deploys the server without changing current database write access.
2. Release the updated app to closed testing, verify sign-in and multiplayer with testers on the new app, and then coordinate the production app update.
3. Only after existing online players have updated, run the workflow again and select `database-rules`. This denies direct client writes to rooms and makes the Cloud Functions backend authoritative. Older app versions will no longer be able to play online after this rules lockdown.

Keep the repository version of the rules authoritative instead of editing production rules directly in the Firebase Console.

The workflow does not configure Authentication providers, Google/Facebook OAuth, iOS URL schemes, GitHub environments/secrets, Cloud billing, or Play Console settings. Those require owner access to Firebase, Google Cloud, Meta, and GitHub. The iOS provider placeholders in [`ios/LudoGame/Info.plist`](./ios/LudoGame/Info.plist) must be replaced before iOS sign-in can be tested.

## Android closed testing release

The checked-in Android release version (`1.0.2`, `versionCode` 3) is now above the previously used Play Console code 2, so even a locally built AAB will not reuse code 2. The manually approved Google Play workflow calculates each release from this baseline and GitHub's monotonically increasing workflow run number (for example, run 1 builds `1.0.3` / version code 4; run 2 builds `1.0.4` / version code 5). Failed or cancelled runs can leave gaps. Before uploading, check Play Console's highest previously used version code; if it is higher than the workflow's generated code, increase the checked-in baseline in `android/app/build.gradle`. Google Play permanently rejects a version code that has already been used, including codes from uploads that were later discarded.

The manually triggered [Android closed testing release workflow](./.github/workflows/android-closed-release.yml) runs only from `main`, increments the patch version and version code for each run, then uploads a signed Android App Bundle to the Play Console **closed testing** track after lint and tests pass. It does not publish to production. A successful workflow shows a **Google Play closed-testing upload confirmed** summary with the uploaded version and links to Play Console; a failed upload step is reported as a failure and is not confirmed. Merge and review the release changes on `main`, configure these GitHub repository secrets, then run **Android closed testing release** from the Actions tab on `main` and confirm the upload input:

- `ANDROID_UPLOAD_KEYSTORE_BASE64`: Base64-encoded contents of the Play upload keystore.
- `ANDROID_UPLOAD_STORE_PASSWORD`: Upload keystore password.
- `ANDROID_UPLOAD_KEY_ALIAS`: Upload key alias.
- `ANDROID_UPLOAD_KEY_PASSWORD`: Upload key password.
- `PLAY_SERVICE_ACCOUNT_JSON`: Raw JSON for a Google Play Developer API service account that has access to this app.

Keep the upload key backed up securely. Never add the keystore, its passwords, or the Play service-account JSON to Git. The Play Console app `com.gamegape.ludokingdom` and closed-testing track must exist, Play App Signing must be configured, and the service account must have permission to manage releases. Testers must be enrolled in the closed-testing track before they can install the release.

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
