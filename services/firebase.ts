import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAHDcyORi6A9Vyf2MZ8QiHgO0USSDt7VcA",
    authDomain: "gen-lang-client-0883796692.firebaseapp.com",
    projectId: "gen-lang-client-0883796692",
    storageBucket: "gen-lang-client-0883796692.appspot.com",
    messagingSenderId: "940232133500",
    appId: "1:940232133500:web:b15a507c428ac24567b2f9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence
// enableIndexedDbPersistence(db).catch((err) => {
//   if (err.code == 'failed-precondition') {
//      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
//      console.log('Persistence failed: Multiple tabs open');
//   } else if (err.code == 'unimplemented') {
//      // The current browser does not support all of the features required to enable persistence
//      console.log('Persistence failed: Not supported');
//   }
// });

export { db };
