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

const PLAYER_ID_KEY = "paperplane.playerId.v1";
const NICKNAME_KEY = "paperplane.nickname.v1";
const LOCAL_RANKING_BEST_KEY = "paperplane.rankingBest.v1";

export const isLeaderboardConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let firestoreApi = null;

function getOrCreatePlayerId() {
  let playerId = localStorage.getItem(PLAYER_ID_KEY);
  if (!playerId) {
    playerId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }
  return playerId;
}

function cleanNickname(nickname) {
  return String(nickname || "pilot").trim().slice(0, 16) || "pilot";
}

export function getSavedNickname() {
  return localStorage.getItem(NICKNAME_KEY) || "";
}

export function getLocalRankingBest() {
  return Number(localStorage.getItem(LOCAL_RANKING_BEST_KEY) || 0);
}

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
  const playerId = getOrCreatePlayerId();
  const savedNickname = getSavedNickname();
  const cleanName = savedNickname || cleanNickname(nickname);
  const cleanDistance = Number(distance.toFixed(1));
  const localBest = getLocalRankingBest();

  if (!Number.isFinite(cleanDistance) || cleanDistance < 0) {
    return { saved: false, reason: "invalid", distance: localBest, nickname: cleanName };
  }

  if (cleanDistance <= localBest) {
    return { saved: false, reason: "not_local_best", distance: localBest, nickname: cleanName };
  }

  const scoreRef = api.doc(api.db, "scores", playerId);
  const scoreSnap = await api.getDoc(scoreRef);
  const oldScore = scoreSnap.exists() ? scoreSnap.data() : null;
  const oldDistance = Number(oldScore?.distance || 0);
  const lockedName = oldScore?.nickname || cleanName;

  localStorage.setItem(NICKNAME_KEY, lockedName);

  if (oldScore && cleanDistance <= oldDistance) {
    localStorage.setItem(LOCAL_RANKING_BEST_KEY, String(oldDistance));
    return { saved: false, reason: "not_remote_best", distance: oldDistance, nickname: lockedName };
  }

  const payload = {
    playerId,
    nickname: lockedName,
    distance: cleanDistance,
    updatedAt: api.serverTimestamp(),
  };

  if (!oldScore) {
    payload.createdAt = api.serverTimestamp();
  }

  await api.setDoc(scoreRef, payload, { merge: true });
  localStorage.setItem(LOCAL_RANKING_BEST_KEY, String(cleanDistance));

  return {
    saved: true,
    reason: oldScore ? "updated" : "created",
    distance: cleanDistance,
    nickname: lockedName,
  };
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
