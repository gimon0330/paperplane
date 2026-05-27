// Firebase Firestore leaderboard adapter for GitHub Pages.
// Firebase config is public by design. Protect writes with Firestore Security Rules.

const firebaseConfig = {
  apiKey: "AIzaSyAAZpXwvcBTJT9fp3OT_Zks0bvbkppJKJk",
  authDomain: "paperplane-2cbdf.firebaseapp.com",
  projectId: "paperplane-2cbdf",
  storageBucket: "paperplane-2cbdf.firebasestorage.app",
  messagingSenderId: "347747478526",
  appId: "1:347747478526:web:05a9edcc7530cdfe386eaf",
  measurementId: "G-Y0ZY2HHPKZ",
};

export const isLeaderboardConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let firestoreApi = null;

async function getFirestoreApi() {
  if (!isLeaderboardConfigured) {
    throw new Error("Leaderboard is not configured yet.");
  }

  if (firestoreApi) return firestoreApi;

  const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  const app = appModule.initializeApp(firebaseConfig);
  const db = firestoreModule.getFirestore(app);
  firestoreApi = { db, ...firestoreModule };
  return firestoreApi;
}

export async function submitScore(nickname, distance) {
  const api = await getFirestoreApi();
  const cleanName = String(nickname || "pilot").trim().slice(0, 16) || "pilot";
  const cleanDistance = Number(distance.toFixed(1));

  await api.addDoc(api.collection(api.db, "scores"), {
    nickname: cleanName,
    distance: cleanDistance,
    createdAt: api.serverTimestamp(),
  });
}

export async function loadLeaderboard() {
  if (!isLeaderboardConfigured) return [];

  const api = await getFirestoreApi();
  const q = api.query(api.collection(api.db, "scores"), api.orderBy("distance", "desc"), api.limit(5));
  const snapshot = await api.getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
