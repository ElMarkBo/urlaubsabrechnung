// Firebase-Anbindung: anonyme Auth + Firestore mit Offline-Persistenz.
// Kapselt alles Cloud-Bezogene — app.js kennt nur die Funktionen hier
// unten, nicht Firebase direkt.
//
// Datenmodell:
//   trips/{tripId}                      { title, currency, categories, createdAt }
//   trips/{tripId}/expenses/{expenseId} { amount, category, date, note, owner, createdAt }
//
// tripId = kurzer, von uns generierter Code (siehe generateTripCode), den
// beide Geräte kennen müssen. Sicherheitsmodell siehe firestore.rules.

import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const TRIP_ID_KEY = "urlaubsabrechnung_tripid";
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // ohne O/0, I/1, L — Verwechslungsgefahr

export function isConfigured() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO";
}

let app, auth, db;
let unsubTrip = null;
let unsubExpenses = null;
let currentTripId = null;

const callbacks = {
  onTripData: () => {},
  onExpenses: () => {},
  onConnectionChange: () => {},
  onAuthError: () => {},
};

function reportConnection(fromCache, hasPendingWrites) {
  // grobe, aber ehrliche Anzeige: "synchronisiert" nur wenn Daten vom
  // Server bestätigt UND nichts mehr lokal in der Warteschlange ist.
  const synced = !fromCache && !hasPendingWrites;
  callbacks.onConnectionChange(synced);
}

export function generateTripCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function getStoredTripId() {
  return localStorage.getItem(TRIP_ID_KEY) || null;
}

function storeTripId(id) {
  localStorage.setItem(TRIP_ID_KEY, id);
}

function clearStoredTripId() {
  localStorage.removeItem(TRIP_ID_KEY);
}

export function initSync(cb) {
  Object.assign(callbacks, cb);

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve();
        return;
      }
      signInAnonymously(auth).catch((err) => {
        console.error("Anonyme Anmeldung fehlgeschlagen:", err);
        callbacks.onAuthError(err);
      });
    });
  });
}

function subscribeToTrip(tripId) {
  unsubscribeAll();
  currentTripId = tripId;
  storeTripId(tripId);

  unsubTrip = onSnapshot(
    doc(db, "trips", tripId),
    { includeMetadataChanges: true },
    (snap) => {
      callbacks.onTripData(snap.exists() ? snap.data() : null, tripId);
      reportConnection(snap.metadata.fromCache, snap.metadata.hasPendingWrites);
    },
    (err) => console.error("Trip-Listener-Fehler:", err)
  );

  unsubExpenses = onSnapshot(
    collection(db, "trips", tripId, "expenses"),
    { includeMetadataChanges: true },
    (snap) => {
      const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callbacks.onExpenses(expenses);
      const anyPending = snap.docs.some((d) => d.metadata.hasPendingWrites);
      reportConnection(snap.metadata.fromCache, anyPending);
    },
    (err) => console.error("Expenses-Listener-Fehler:", err)
  );
}

function unsubscribeAll() {
  if (unsubTrip) unsubTrip();
  if (unsubExpenses) unsubExpenses();
  unsubTrip = null;
  unsubExpenses = null;
  currentTripId = null;
}

/** Neue Reise anlegen, Code zurückgeben. */
export async function createTrip({ title, currency, categories }) {
  const tripId = generateTripCode();
  await setDoc(doc(db, "trips", tripId), {
    title: title || "",
    currency: currency || "EUR",
    categories,
    createdAt: Date.now(),
  });
  subscribeToTrip(tripId);
  return tripId;
}

/**
 * Bestehender Reise beitreten. Prüft (sofern online) ob der Code
 * existiert. Gibt true zurück wenn erfolgreich abonniert.
 */
export async function joinTrip(rawCode) {
  const tripId = rawCode.trim().toUpperCase();
  if (!tripId) return false;
  try {
    const snap = await getDoc(doc(db, "trips", tripId));
    if (!snap.exists()) return false;
  } catch (err) {
    // offline: können Existenz nicht prüfen — optimistisch trotzdem
    // abonnieren, der Listener liefert nach, sobald Netz da ist.
    console.warn("Konnte Reise-Code nicht online prüfen (evtl. offline):", err);
  }
  subscribeToTrip(tripId);
  return true;
}

/** Aktuell gespeicherte Reise beim Start automatisch wieder abonnieren. */
export function resumeStoredTrip() {
  const id = getStoredTripId();
  if (id) subscribeToTrip(id);
  return id;
}

/** Lokale Zuordnung zur Reise vergessen (Cloud-Daten bleiben bestehen). */
export function leaveTrip() {
  unsubscribeAll();
  clearStoredTripId();
}

export function getCurrentTripId() {
  return currentTripId;
}

export async function updateTripMeta(partial) {
  if (!currentTripId) return;
  await setDoc(doc(db, "trips", currentTripId), partial, { merge: true });
}

export async function addExpense(expense) {
  if (!currentTripId) throw new Error("Keine aktive Reise");
  await setDoc(doc(db, "trips", currentTripId, "expenses", expense.id), expense);
}

export async function updateExpense(expense) {
  if (!currentTripId) throw new Error("Keine aktive Reise");
  await setDoc(doc(db, "trips", currentTripId, "expenses", expense.id), expense);
}

export async function deleteExpense(id) {
  if (!currentTripId) return;
  await deleteDoc(doc(db, "trips", currentTripId, "expenses", id));
}
