// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAtxJBR1YM_6pk1b21D6f8zQxmOQ-CyOiw",
  authDomain: "course-693eb.firebaseapp.com",
  projectId: "course-693eb",
  storageBucket: "course-693eb.firebasestorage.app",
  messagingSenderId: "776025921584",
  appId: "1:776025921584:web:9af9e0b0c92a76c9a675f5",
  measurementId: "G-2HX75WLX8J"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const analytics = getAnalytics(app);
