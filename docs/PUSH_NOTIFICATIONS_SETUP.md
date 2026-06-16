# Push Notifications Setup

This app uses Firebase Cloud Messaging (FCM) as the push transport. The backend
sends messages through the Firebase Admin SDK; the app registers a native device
token (`getDevicePushTokenAsync`) and syncs it to `PATCH /auth/fcm-token`.

Firebase is only the delivery channel — all auth, alerts, and business logic live
in the NestJS backend and PostgreSQL.

---

## Android — already configured

Nothing to do on your side. For the record, this is what makes it work:

- `mobile/google-services.json` is present for project `designlitest-2f71d`,
  package `com.jr.designli`.
- The backend initializes Firebase Admin from `FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (see `backend/.env.example`).
- A **native build** (the APK we generate — not Expo Go) registers an FCM token
  that belongs to `designlitest-2f71d`, so the backend can deliver to it.

> The reason a real APK matters: inside Expo Go the FCM token is bound to Expo's
> own Firebase project, so our backend can't send to it. The standalone build
> fixes that.

---

## iOS — requires an Apple Developer account

Apple routes all push through APNs, and FCM forwards to APNs on the backend's
behalf. So you need to give Firebase an APNs key. One-time setup:

### 1. Register the iOS app in Firebase

1. Firebase Console -> project `designlitest-2f71d` -> Add app -> iOS.
2. iOS bundle ID: `com.jr.designli`.
3. Download `GoogleService-Info.plist`.
4. Put it in the mobile project and point `app.json` at it:
   ```json
   "ios": {
     "bundleIdentifier": "com.jr.designli",
     "googleServicesFile": "./GoogleService-Info.plist"
   }
   ```

### 2. Create an APNs Authentication Key (.p8)

1. Go to https://developer.apple.com -> Certificates, Identifiers & Profiles.
   In the **left sidebar** pick **Keys** (not Certificates / Identifiers /
   Profiles). Direct link: https://developer.apple.com/account/resources/authkeys/list
2. Click **+** (Create a key), give it a name (e.g. `designli-fcm`), check
   **Apple Push Notifications service (APNs)**, Continue -> Register.
3. **Download the `.p8`** — Apple lets you download it only once. Store it safely.
4. Note the **Key ID** (10 chars, shown on the key page) and your **Team ID**
   (10 chars, top-right of the developer portal, next to your account name).

> Apple offers two ways to authenticate push: an APNs **certificate** (`.p12`,
> older, lives under Certificates) or an APNs **Auth Key** (`.p8`, recommended —
> one key works for all your apps and never expires). We use the `.p8`, which is
> why you go to **Keys**, not Certificates.

### 3. Upload the APNs key to Firebase

1. Firebase Console -> Project Settings -> Cloud Messaging.
2. Under **Apple app configuration -> APNs Authentication Key** -> Upload.
3. Upload the `.p8`, enter the Key ID and Team ID.

### 4. Register the App ID and enable Push Notifications

The `com.jr.designli` identifier won't exist until you create it (or until Xcode
auto-creates it on the first signed build). To create it manually:

1. https://developer.apple.com -> Identifiers -> click the **+** next to the title.
2. **App IDs** -> Continue -> type **App** -> Continue.
3. Description: e.g. `Designli Stocks`. Bundle ID: **Explicit** -> `com.jr.designli`.
4. In the **Capabilities** list, check **Push Notifications**.
5. Continue -> Register.

> If you instead let Xcode manage signing automatically during the build, it
> creates this App ID and provisions the push capability for you (the
> `expo-notifications` plugin adds the `aps-environment` entitlement).

### 5. Build a dev/standalone iOS build (not Expo Go)

Expo Go can't carry the APNs entitlement, so push only works in a custom build.
Locally (needs Xcode + your Apple signing team):

```bash
cd mobile
npx expo prebuild -p ios
npx expo run:ios --configuration Release
```

If signing fails, open `ios/*.xcworkspace` in Xcode once, select your Team under
Signing & Capabilities, then re-run. The Push Notifications capability is added
automatically by the `expo-notifications` config plugin.

### 6. Test on a physical iPhone

The iOS Simulator can technically receive APNs since Xcode 14, but it's
unreliable. Use a real device:

1. Run the build on the iPhone, log in, grant the notification prompt.
2. The app calls `getDevicePushTokenAsync()` and syncs the token via
   `PATCH /auth/fcm-token`.
3. Create a price alert below the current price; when a tick crosses it the
   backend sends the push and the device shows it.

---

## Quick manual test (either platform)

Once a device token is in the `users` table, you can fire a push straight from
the backend host without waiting for a market tick:

```bash
cd backend
node -e "
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const app = initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\n'),
})});
getMessaging(app).send({
  token: 'PASTE_DEVICE_TOKEN',
  notification: { title: 'Price Alert', body: 'AAPL reached \$250' },
  data: { symbol: 'AAPL', price: '250' },
}).then(id => console.log('sent', id)).catch(e => { console.error(e); process.exit(1); });
"
```

> Uses the firebase-admin v14 modular API (`firebase-admin/app` +
> `firebase-admin/messaging`), matching the backend. Load the `FIREBASE_*` vars
> first, e.g. `set -a && . ./.env && set +a`.

A returned message ID means the full delivery path works.
