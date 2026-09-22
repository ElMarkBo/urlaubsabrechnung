// Web-App-Konfiguration aus der Firebase-Konsole (Projekteinstellungen →
// Allgemein → Meine Apps → Web-App → "SDK-Setup und Konfiguration").
//
// Das ist KEIN Geheimnis — Firebase-Web-Configs sind grundsätzlich
// öffentlich (jede Firebase-Web-App liefert sie an jeden Browser aus).
// Der eigentliche Schutz läuft über die Firestore-Sicherheitsregeln
// (siehe firestore.rules), nicht über Geheimhaltung dieser Werte.
//
// TODO: mit den echten Werten aus der eigenen Firebase-Konsole ersetzen
// (siehe projekt.md, Abschnitt "Firebase-Einrichtung"). Ohne diese Werte
// bleibt die App im Demo/Offline-Zustand ohne Sync.
export const firebaseConfig = {
  apiKey: "AIzaSyBktfjSMJoenZLaRdacr5KGhYnf0NQ9OWc",
  authDomain: "urlaubskasse-7b6ee.firebaseapp.com",
  projectId: "urlaubskasse-7b6ee",
  storageBucket: "urlaubskasse-7b6ee.firebasestorage.app",
  messagingSenderId: "852226595926",
  appId: "1:852226595926:web:7addfca0ce92f176b1aff7",
};
