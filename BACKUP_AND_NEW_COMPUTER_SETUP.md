# Backup and New Computer Setup

This repository contains the app, Firebase Cloud Functions, and database rules. It intentionally does not contain private signing keys, passwords, service-account keys, or machine-specific Firebase files. A Git clone alone is not a backup of those items.

## Back up securely before changing computers

Store these outside the repository in an encrypted password manager or encrypted backup. Keep a second protected backup of the Android upload keystore; losing it can block Play Store releases.

- `upload-keystore.jks` at the repository root: Android Play upload keystore.
- `android/keystore.properties`: local signing configuration containing the keystore password, alias, and key password.
- Android release signing values: store password, key alias, and key password. Save them in the password manager as well as the local properties file.
- Google Play Developer API service-account JSON: required only if restoring the Play upload workflow credentials. Store its JSON securely, never in Git.
- Cloud deployment identity details: Workload Identity Provider resource name and deployment service-account email. These are configured as GitHub environment secrets, not downloaded as a service-account private key.
- Provider owner credentials and app secrets: Google Cloud/Firebase and Meta account access, including the Facebook App Secret. These stay in their provider consoles/password manager, not in the app.

Do not place any of the above in this repository, a public cloud folder, or an unencrypted removable drive. The checked-in `*.jks` and `keystore.properties` ignore rules are intentional.

## Restore after cloning

1. Install the tools listed in the README, clone the repository, and run `npm ci`. A debug/offline build does not require the Play upload keystore or production backend credentials.
2. For Android Firebase features, download the Android app's `google-services.json` from Firebase Console and place it at `android/app/google-services.json`. This file is ignored by Git. Confirm the Firebase project values in `Src/config/firebase.js` match the intended project.
3. For a local signed Android release, restore `upload-keystore.jks` to the repository root and create `android/keystore.properties` with the following structure. Fill the values locally from the password manager; do not commit this file.

   ```properties
   storeFile=../upload-keystore.jks
   storePassword=YOUR_UPLOAD_KEYSTORE_PASSWORD
   keyAlias=YOUR_UPLOAD_KEY_ALIAS
   keyPassword=YOUR_UPLOAD_KEY_PASSWORD
   ```

4. For iOS sign-in, replace the provider placeholders in `ios/LudoGame/Info.plist` with values from the Firebase, Google Cloud, and Meta app configurations. iOS builds require macOS and Xcode.
5. For Firebase backend deployment, restore the `firebase-production` GitHub environment settings documented in the README: `FIREBASE_PROJECT_ID` and `FIREBASE_DATABASE_URL` variables, plus `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT` secrets. Recreate the Google Cloud Workload Identity Federation trust for this GitHub repository and `main` branch. Do not create or upload a long-lived service-account key.
6. For a Play closed-testing release, restore the GitHub secrets documented in the README: `ANDROID_UPLOAD_KEYSTORE_BASE64`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`, and `PLAY_SERVICE_ACCOUNT_JSON`.
7. Recreate App Check debug tokens for the new development device in Firebase Console. Do not copy debug tokens into source control.

## Configuration already in Git

`Src/config/firebase.js` contains Firebase web app configuration and OAuth/app identifiers needed by the client. These are client configuration values, not Firebase Admin credentials. The Facebook App ID and client token in the native app files are also client-side values; the Facebook App Secret, Google client secrets, and Firebase Admin/service-account private keys must never be added to the mobile app or repository.

Firebase Cloud Functions and database rules are versioned in `functions/` and `database.rules.json`. The Firebase deployment workflow uses GitHub OIDC; GitHub environment configuration and provider-console settings are not included in a clone. User profiles and username reservations are accessed through the authenticated `profileCommand` Cloud Function; deploy the Functions target before releasing an app that requires profile setup.