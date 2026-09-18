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
  apiKey: "TODO",
  authDomain: "TODO.firebaseapp.com",
  projectId: "TODO",
  storageBucket: "TODO.appspot.com",
  messagingSenderId: "TODO",
  appId: "TODO",
};
