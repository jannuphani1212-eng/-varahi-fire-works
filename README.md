# VARAHI FIRE WORKS — Website package

This is a mobile-first **informational showcase website** with a Firebase-powered private owner dashboard.

## Important legal scope
This package intentionally does **not** include online prices, discounts, stock/availability claims, cart, online purchase, order/enquiry capture, booking, payment, delivery claims, or WhatsApp purchase buttons. Before adding any transaction or sales functionality, obtain current advice from a qualified lawyer and the relevant licensing authorities. Fireworks sales are subject to strict legal controls in India.

## Included
- Responsive public home page, business information, searchable/category-filtered showcase.
- Product detail view with multiple photos.
- Owner email/password sign-in using Firebase Authentication.
- Add, edit, publish/hide and delete informational entries.
- Upload up to 8 images per entry from a phone gallery (8 MB each).
- Firestore and Storage security rules.
- Starter privacy notice.

## 1. Create/configure Firebase
1. Open https://console.firebase.google.com/ and select your Firebase project.
2. Add a Web App if one does not exist. Copy its Firebase configuration.
3. Open `firebase-config.js` and replace every `REPLACE_WITH_...` value with the matching value from Firebase.
4. In Firebase Console → Authentication → Sign-in method, enable **Email/Password**.
5. Create the owner account in Authentication → Users → Add user. Use a strong unique password.
6. Open that user record and copy its **User UID**.
7. Replace `REPLACE_WITH_OWNER_AUTH_UID` with that UID in **both** `firestore.rules` and `storage.rules`.
8. Create a Firestore database. Deploy `firestore.rules` in Firestore → Rules.
9. Set up Firebase Storage. Deploy `storage.rules` in Storage → Rules.
10. Publish the website on HTTPS hosting. Do not open `index.html` directly from the phone's file manager; Firebase ES modules need a web server.

## 2. Hosting
The `firebase.json` file is included for Firebase Hosting. Firebase CLI deployment is usually performed from a computer or a supported cloud development environment:
- `firebase login`
- `firebase init hosting` (if not already initialized; select this folder and public directory `.`)
- `firebase deploy`

If you only have an Android phone, use a trusted browser-based development environment that supports Firebase CLI, or ask a developer to deploy this folder. Do not share your Firebase password or owner account password.

## 3. Owner dashboard
Visit `https://YOUR-HOST/admin.html`, sign in with the owner Firebase email/password, add entries and select photos from the phone. Only the UID placed in the rules can write. Public visitors can read published entries only.

## Security notes
- Firebase Web App config is not a secret. Security depends on Authentication and Firestore/Storage Rules.
- Never place service-account JSON, private keys, or admin SDK credentials in this website.
- Review rules after any changes. Test with an owner account and a signed-out visitor.
- Public images are readable by anyone who can access the public showcase. Do not upload private images.
- The dashboard does not currently delete old Storage images when an entry is deleted; remove unused files from Firebase Storage manually.
- This starter privacy notice should be reviewed and updated before public launch.

## Troubleshooting
- "Firebase setup is required": one or more placeholders remain in `firebase-config.js`.
- Sign-in fails: verify Email/Password is enabled and that the owner user exists.
- Permission denied: verify the owner UID is correct in both rules and that the rules were published.
- Photos fail to upload: verify Storage is enabled, the Storage bucket value is exact, and the owner UID/rules match.
- Public page shows no entries: add an entry in `admin.html` and tick "Publish this entry".
