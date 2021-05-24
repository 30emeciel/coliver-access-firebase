# coliver-access-firestore

Security rules for coliver-access firestore, with **unit tests** using the Firebase Emulator Suite.

## Setup

To install the dependencies for this sample run `npm install` inside this directory.
You will also need the [Firebase CLI](https://firebase.google.com/docs/cli).

## Run

To run the Cloud Firestore tests:

```
firebase emulators:exec --only firestore "npm run test-firestore"
```
