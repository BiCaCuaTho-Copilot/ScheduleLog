---
name: project-firebase-config
description: Firebase configuration for PT Studio project — needed for Firestore integration
metadata:
  type: project
---

Firebase project for PT Studio web app.

**Why:** User wants real-time sync between PC and mobile devices via Firestore instead of localStorage.

**How to apply:** Use these values when setting up Firebase SDK and Firestore integration in the codebase.

```js
const firebaseConfig = {
  apiKey: "AIzaSyB2-BbxVTDTdhs5EQsHVnyJ8pEoCCF03nU",
  authDomain: "pt-studio-web.firebaseapp.com",
  projectId: "pt-studio-web",
  storageBucket: "pt-studio-web.firebasestorage.app",
  messagingSenderId: "714824638661",
  appId: "1:714824638661:web:fbae016a4e2ff5688410ac",
  measurementId: "G-PR6192ZVMV"
};
```

- Project ID: `pt-studio-web`
- Region: (set during Firestore creation — likely asia-southeast1)
- Analytics enabled: yes (measurementId present)
