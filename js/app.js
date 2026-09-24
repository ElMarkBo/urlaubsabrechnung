"use strict";

/* =========================================================================
   Urlaubsabrechnung — UI-Logik. Alle Cloud-/Sync-Details stecken in
   sync.js (Firebase Auth + Firestore mit Offline-Persistenz); diese
   Datei kennt nur dessen Funktionen und rendert das Ergebnis.

   Geteilter Zustand (Titel, Währung, Kategorien, Ausgaben) kommt aus
   Firestore und wird automatisch zwischen allen Geräten synchronisiert,
   die denselben Reise-Code kennen. Nur der eigene Name ("Dein Name")
   ist geräte-lokal (localStorage), nicht Teil der Reise-Daten.
   ========================================================================= */

import * as sync from "./sync.js";

const OWNER_KEY = "urlaubsabrechnung_owner";

const CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "JPY", "SEK", "NOK", "DKK",
  "PLN", "CZK", "HUF", "TRY", "THB", "AUD", "CAD",
];

const DEFAULT_CATEGORIES = ["Unterkunft", "Essen", "Auto", "Freizeit"];

const CHART_COLOR_VARS = [
  "--chart-1", "--chart-2", "--chart-3", "--chart-4",
  "--chart-5", "--chart-6", "--chart-7", "--chart-8",
];

// In-memory Spiegel der Firestore-Daten der aktuellen Reise.
let trip = { title: "", currency: "EUR", categories: [...DEFAULT_CATEGORIES], expenses: [] };
let ownerName = localStorage.getItem(OWNER_KEY) || "";

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function fmtMoney(amount) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: trip.currency || "EUR",
    currencyDisplay: "code",
  }).format(amount);
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---------------------------------------------------------------------- */
/* DOM refs                                                                */
/* ---------------------------------------------------------------------- */

const el = (id) => document.getElementById(id);

const onboardingEl = el("onboarding");
const appRootEl = el("app-root");
const obTitle = el("ob-title");
const obCode = el("ob-code");
const obJoinError = el("ob-join-error");
const obConfigWarning = el("ob-config-warning");

const syncStatusEl = el("sync-status");
const tripTitleDisplay = el("trip-title-display");
const tabsNav = el("tabs");
const tabPanels = document.querySelectorAll(".tab-panel");

const expenseForm = el("expense-form");
const fAmount = el("f-amount");
const fCurrencyLabel = el("f-currency-label");
const fCategory = el("f-category");
const fDate = el("f-date");
const fNote = el("f-note");
const fSubmitBtn = el("f-submit-btn");
const fCancelEdit = el("f-cancel-edit");
const saveHint = el("save-hint");

const filterSearch = el("filter-search");
const filterCategory = el("filter-category");
const filterOwner = el("filter-owner");
const sortOrder = el("sort-order");
const expenseListEl = el("expense-list");
const listEmptyEl = el("list-empty");

const summaryCardsEl = el("summary-cards");
const chartCategoryCanvas = el("chart-category");
const categoryLegendEl = el("category-legend");
const chartDailyCanvas = el("chart-daily");
const personSection = el("person-section");
const chartOwnerCanvas = el("chart-owner");
const ownerLegendEl = el("owner-legend");

const settingsDialog = el("settings-dialog");
const settingsForm = el("settings-form");
const sTripTitle = el("s-trip-title");
const sOwner = el("s-owner");
const sCurrency = el("s-currency");
const categoryManageList = el("category-manage-list");
const sNewCategory = el("s-new-category");
const sTripCode = el("s-trip-code");

/* ---------------------------------------------------------------------- */
/* Onboarding (Reise anlegen / beitreten)                                  */
/* ---------------------------------------------------------------------- */

function showOnboarding() {
  onboardingEl.hidden = false;
  appRootEl.hidden = true;
}

function showApp() {
  onboardingEl.hidden = true;
  appRootEl.hidden = false;
}

el("btn-create-trip").addEventListener("click", async () => {
  const title = obTitle.value.trim();
  el("btn-create-trip").disabled = true;
  try {
    await sync.createTrip({ title, currency: "EUR", categories: [...DEFAULT_CATEGORIES] });
    showApp();
  } catch (err) {
    alert("Reise konnte nicht angelegt werden: " + err.message);
  } finally {
    el("btn-create-trip").disabled = false;
  }
});

el("btn-join-trip").addEventListener("click", async () => {
  obJoinError.hidden = true;
  el("btn-join-trip").disabled = true;
  try {
    const ok = await sync.joinTrip(obCode.value);
    if (ok) {
      showApp();
    } else {
      obJoinError.hidden = false;
    }
  } catch (err) {
    alert("Beitreten fehlgeschlagen: " + err.message);
  } finally {
    el("btn-join-trip").disabled = false;
  }
});

/* ---------------------------------------------------------------------- */
/* Tabs                                                                    */
/* ---------------------------------------------------------------------- */

tabsNav.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
  tabPanels.forEach((p) => p.classList.toggle("active", p.id === `tab-${btn.dataset.tab}`));
  if (btn.dataset.tab === "auswertung") renderAuswertung();
});

/* ---------------------------------------------------------------------- */
/* Select population                                                       */
/* ---------------------------------------------------------------------- */

function populateCategorySelects() {
  const selects = [fCategory, filterCategory];
  const prevValues = selects.map((s) => s.value);

  fCategory.innerHTML = trip.categories
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join("");

  filterCategory.innerHTML =
    `<option value="">Alle Kategorien</option>` +
    trip.categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  selects.forEach((s, i) => {
    if (prevValues[i] && [...s.options].some((o) => o.value === prevValues[i])) {
      s.value = prevValues[i];
    }
  });
}

function populateCurrencySelect() {
  sCurrency.innerHTML = CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  sCurrency.value = trip.currency;
}

function getOwnerList() {
  const owners = new Set(trip.expenses.map((x) => x.owner).filter(Boolean));
  return [...owners].sort((a, b) => a.localeCompare(b, "de"));
}

function populateOwnerFilter() {
  const owners = getOwnerList();
  const prev = filterOwner.value;
  if (owners.length < 2) {
    filterOwner.innerHTML = "";
    filterOwner.hidden = true;
    return;
  }
  filterOwner.hidden = false;
  filterOwner.innerHTML =
    `<option value="">Alle Personen</option>` +
    owners.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
  if (owners.includes(prev)) filterOwner.value = prev;
}

/* ---------------------------------------------------------------------- */
/* Header / labels                                                         */
/* ---------------------------------------------------------------------- */

function renderHeader() {
  tripTitleDisplay.textContent = trip.title || "Urlaubsabrechnung";
  fCurrencyLabel.textContent = trip.currency;
}

/* ---------------------------------------------------------------------- */
/* Erfassen                                                                 */
/* ---------------------------------------------------------------------- */

fDate.value = todayISO();

let editingId = null;

function startEdit(item) {
  editingId = item.id;
  fAmount.value = item.amount;
  fCategory.value = item.category;
  fDate.value = item.date;
  fNote.value = item.note || "";
  fSubmitBtn.textContent = "Speichern";
  fCancelEdit.hidden = false;
  document.querySelector('.tab[data-tab="erfassen"]').click();
  fDate.focus();
}

function endEdit() {
  editingId = null;
  fSubmitBtn.textContent = "Hinzufügen";
  fCancelEdit.hidden = true;
  expenseForm.reset();
  fDate.value = todayISO();
}

fCancelEdit.addEventListener("click", endEdit);

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat(fAmount.value.replace(",", "."));
  if (!isFinite(amount) || amount <= 0) return;

  if (editingId) {
    const original = trip.expenses.find((x) => x.id === editingId);
    if (!original) { endEdit(); return; }
    const expense = {
      ...original,
      amount: Math.round(amount * 100) / 100,
      category: fCategory.value,
      date: fDate.value || todayISO(),
      note: fNote.value.trim().slice(0, 200),
    };
    sync.updateExpense(expense).catch((err) => alert("Konnte Eintrag nicht speichern: " + err.message));
    endEdit();
  } else {
    const expense = {
      id: uid(),
      amount: Math.round(amount * 100) / 100,
      category: fCategory.value,
      date: fDate.value || todayISO(),
      note: fNote.value.trim().slice(0, 200),
      owner: ownerName,
      createdAt: Date.now(),
    };
    sync.addExpense(expense).catch((err) => alert("Konnte Eintrag nicht speichern: " + err.message));
    fAmount.value = "";
    fNote.value = "";
    fAmount.focus();
  }

  saveHint.hidden = false;
  clearTimeout(saveHint._t);
  saveHint._t = setTimeout(() => { saveHint.hidden = true; }, 1600);
});

/* ---------------------------------------------------------------------- */
/* Liste                                                                    */
/* ---------------------------------------------------------------------- */

const SORTERS = {
  "date-desc": (a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)),
  "date-asc": (a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date)),
  "amount-desc": (a, b) => b.amount - a.amount,
  "amount-asc": (a, b) => a.amount - b.amount,
};

function getFilteredExpenses() {
  const q = filterSearch.value.trim().toLowerCase();
  const cat = filterCategory.value;
  const owner = filterOwner.value;
  const sorter = SORTERS[sortOrder.value] || SORTERS["date-desc"];
  return trip.expenses
    .filter((x) => (cat ? x.category === cat : true))
    .filter((x) => (owner ? x.owner === owner : true))
    .filter((x) => (q ? x.note.toLowerCase().includes(q) : true))
    .sort(sorter);
}

function categoryColor(category) {
  const idx = trip.categories.indexOf(category);
  const varName = CHART_COLOR_VARS[(idx < 0 ? 0 : idx) % CHART_COLOR_VARS.length];
  return cssVar(varName) || "#888";
}

function ownerColor(owner) {
  const idx = getOwnerList().indexOf(owner);
  const varName = CHART_COLOR_VARS[(idx < 0 ? 0 : idx) % CHART_COLOR_VARS.length];
  return cssVar(varName) || "#888";
}

function renderList() {
  populateOwnerFilter();
  const items = getFilteredExpenses();
  listEmptyEl.hidden = items.length > 0;
  expenseListEl.innerHTML = items.map((x) => `
    <li class="expense-item" data-id="${x.id}">
      <span class="cat-dot" style="background:${categoryColor(x.category)}"></span>
      <span class="info">
        <span class="cat">${escapeHtml(x.category)}${x.owner ? ` · <span class="owner-tag">${escapeHtml(x.owner)}</span>` : ""}</span>
        ${x.note ? `<span class="note">${escapeHtml(x.note)}</span>` : ""}
        <span class="date">${fmtDate(x.date)}</span>
      </span>
      <span class="amount">${fmtMoney(x.amount)}</span>
      <button class="edit-btn" aria-label="Bearbeiten" data-edit="${x.id}">✏️</button>
      <button class="del-btn" aria-label="Löschen" data-del="${x.id}">🗑</button>
    </li>
  `).join("");
}

expenseListEl.addEventListener("click", (e) => {
  const editBtn = e.target.closest("[data-edit]");
  if (editBtn) {
    const item = trip.expenses.find((x) => x.id === editBtn.dataset.edit);
    if (item) startEdit(item);
    return;
  }

  const btn = e.target.closest("[data-del]");
  if (!btn) return;
  const id = btn.dataset.del;
  const item = trip.expenses.find((x) => x.id === id);
  if (!item) return;
  if (!confirm(`Eintrag "${item.category} · ${fmtMoney(item.amount)}" löschen?`)) return;
  if (editingId === id) endEdit();
  sync.deleteExpense(id).catch((err) => alert("Konnte nicht löschen: " + err.message));
});

filterSearch.addEventListener("input", renderList);
filterCategory.addEventListener("change", renderList);
filterOwner.addEventListener("change", renderList);
sortOrder.addEventListener("change", renderList);

/* ---------------------------------------------------------------------- */
/* Auswertung                                                               */
/* ---------------------------------------------------------------------- */

function renderAuswertung() {
  const expenses = trip.expenses;
  const total = expenses.reduce((s, x) => s + x.amount, 0);
  const days = new Set(expenses.map((x) => x.date));
  const dayCount = days.size;
  const avgPerDay = dayCount ? total / dayCount : 0;

  summaryCardsEl.innerHTML = `
    <div class="summary-card">
      <div class="label">Gesamt</div>
      <div class="value">${fmtMoney(total)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Einträge</div>
      <div class="value">${expenses.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Tage mit Ausgaben</div>
      <div class="value">${dayCount}</div>
    </div>
    <div class="summary-card">
      <div class="label">Ø pro Tag</div>
      <div class="value">${fmtMoney(avgPerDay)}</div>
    </div>
  `;

  renderHorizontalBarChart(chartCategoryCanvas, categoryLegendEl, groupByCategory(expenses), categoryColor);
  renderDailyChart(expenses);

  const owners = getOwnerList();
  personSection.hidden = owners.length < 2;
  if (owners.length >= 2) {
    renderHorizontalBarChart(chartOwnerCanvas, ownerLegendEl, groupByOwner(expenses), ownerColor);
  }
}

function groupByCategory(expenses) {
  const map = new Map();
  for (const x of expenses) {
    map.set(x.category, (map.get(x.category) || 0) + x.amount);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function groupByOwner(expenses) {
  const map = new Map();
  for (const x of expenses) {
    const key = x.owner || "(ohne Namen)";
    map.set(key, (map.get(key) || 0) + x.amount);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function groupByDate(expenses) {
  const map = new Map();
  for (const x of expenses) {
    map.set(x.date, (map.get(x.date) || 0) + x.amount);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function setupCanvasDPR(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: cssW, h: cssH };
}

function renderHorizontalBarChart(canvas, legendEl, data, colorFn) {
  const { ctx, w, h } = setupCanvasDPR(canvas);
  ctx.clearRect(0, 0, w, h);

  legendEl.innerHTML = "";

  if (!data.length) {
    ctx.fillStyle = cssVar("--text-muted");
    ctx.font = "14px sans-serif";
    ctx.fillText("Noch keine Daten.", 16, h / 2);
    return;
  }

  const max = Math.max(...data.map((d) => d[1]));
  const padding = 16;
  const rowH = Math.min(34, (h - padding * 2) / data.length);
  const labelW = 110;
  const barAreaW = w - padding * 2 - labelW - 70;

  ctx.font = "12px sans-serif";
  ctx.textBaseline = "middle";

  data.forEach(([label, amount], i) => {
    const y = padding + i * rowH + rowH / 2;
    const barW = Math.max(2, (amount / max) * barAreaW);
    const color = colorFn(label);

    ctx.fillStyle = cssVar("--text");
    ctx.textAlign = "left";
    const shortLabel = label.length > 14 ? label.slice(0, 13) + "…" : label;
    ctx.fillText(shortLabel, padding, y);

    ctx.fillStyle = color;
    const barX = padding + labelW;
    const barH = Math.max(6, rowH * 0.55);
    roundRect(ctx, barX, y - barH / 2, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = cssVar("--text-muted");
    ctx.textAlign = "left";
    ctx.fillText(fmtMoney(amount), barX + barW + 8, y);

    const li = document.createElement("li");
    li.innerHTML = `<span class="dot" style="background:${color}"></span>
      <span class="lg-cat">${escapeHtml(label)}</span>
      <span class="lg-amount">${fmtMoney(amount)}</span>`;
    legendEl.appendChild(li);
  });
}

function renderDailyChart(expenses) {
  const data = groupByDate(expenses);
  const { ctx, w, h } = setupCanvasDPR(chartDailyCanvas);
  ctx.clearRect(0, 0, w, h);

  if (!data.length) {
    ctx.fillStyle = cssVar("--text-muted");
    ctx.font = "14px sans-serif";
    ctx.fillText("Noch keine Daten.", 16, h / 2);
    return;
  }

  const max = Math.max(...data.map((d) => d[1]));
  const padding = 16;
  const bottomLabelH = 24;
  const chartH = h - padding - bottomLabelH;
  const barGap = 6;
  const barW = Math.max(4, (w - padding * 2) / data.length - barGap);

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";

  data.forEach(([date, amount], i) => {
    const x = padding + i * (barW + barGap);
    const barH = max ? (amount / max) * chartH : 0;
    ctx.fillStyle = cssVar("--chart-1");
    roundRect(ctx, x, padding + (chartH - barH), barW, Math.max(2, barH), 3);
    ctx.fill();

    if (i % labelEvery === 0 || i === data.length - 1) {
      ctx.fillStyle = cssVar("--text-muted");
      const [, m, d] = date.split("-");
      ctx.fillText(`${d}.${m}.`, x + barW / 2, h - bottomLabelH / 2);
    }
  });
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

window.addEventListener("resize", () => {
  if (document.getElementById("tab-auswertung").classList.contains("active")) {
    renderAuswertung();
  }
});

if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (document.getElementById("tab-auswertung").classList.contains("active")) {
      renderAuswertung();
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Export                                                                   */
/* ---------------------------------------------------------------------- */

function slug(str) {
  return (str || "urlaub").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

el("btn-export-csv").addEventListener("click", () => {
  const header = ["Datum", "Kategorie", "Betrag", "Währung", "Person", "Notiz"];
  const rows = [...trip.expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x) => [x.date, x.category, x.amount.toFixed(2), trip.currency, x.owner, x.note].map(csvEscape).join(";"));
  const csv = [header.join(";"), ...rows].join("\r\n");
  downloadBlob("﻿" + csv, `urlaubsausgaben-${slug(trip.title)}.csv`, "text/csv;charset=utf-8");
});

el("btn-export-json").addEventListener("click", () => {
  downloadBlob(
    JSON.stringify({ ...trip, tripId: sync.getCurrentTripId() }, null, 2),
    `urlaubsabrechnung-backup-${slug(trip.title)}.json`,
    "application/json"
  );
});

/* ---------------------------------------------------------------------- */
/* Settings dialog                                                         */
/* ---------------------------------------------------------------------- */

el("btn-settings").addEventListener("click", () => {
  sTripTitle.value = trip.title;
  sOwner.value = ownerName;
  sTripCode.textContent = sync.getCurrentTripId() || "------";
  populateCurrencySelect();
  renderCategoryManageList();
  settingsDialog.showModal();
});

function renderCategoryManageList() {
  categoryManageList.innerHTML = trip.categories.map((c, i) => `
    <li>
      <span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${categoryColor(c)}"></span>
      <span>${escapeHtml(c)}</span>
      <button type="button" data-remove-cat="${i}" aria-label="Kategorie entfernen">✕</button>
    </li>
  `).join("");
}

categoryManageList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-cat]");
  if (!btn) return;
  const idx = Number(btn.dataset.removeCat);
  if (trip.categories.length <= 1) {
    alert("Mindestens eine Kategorie muss bestehen bleiben.");
    return;
  }
  const removed = trip.categories[idx];
  const inUse = trip.expenses.some((x) => x.category === removed);
  if (inUse && !confirm(`"${removed}" wird noch bei bestehenden Einträgen verwendet. Trotzdem aus der Liste entfernen? Bestehende Einträge behalten den Namen.`)) {
    return;
  }
  const newCategories = trip.categories.filter((_, i) => i !== idx);
  sync.updateTripMeta({ categories: newCategories }).catch((err) => alert("Konnte nicht speichern: " + err.message));
});

function addCategoryFromInput() {
  const name = sNewCategory.value.trim();
  if (!name) return;
  if (trip.categories.includes(name)) {
    alert("Diese Kategorie gibt es schon.");
    return;
  }
  const newCategories = [...trip.categories, name];
  sNewCategory.value = "";
  sync.updateTripMeta({ categories: newCategories }).catch((err) => alert("Konnte nicht speichern: " + err.message));
}

el("btn-add-category").addEventListener("click", addCategoryFromInput);
sNewCategory.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // avoid submitting/closing the <dialog> form
    addCategoryFromInput();
  }
});

el("btn-copy-code").addEventListener("click", async () => {
  const tripId = sync.getCurrentTripId();
  if (!tripId) return;
  const link = `${location.origin}${location.pathname}?trip=${tripId}`;
  try {
    await navigator.clipboard.writeText(link);
    const btn = el("btn-copy-code");
    const original = btn.textContent;
    btn.textContent = "Kopiert!";
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch {
    alert(`Konnte nicht automatisch kopieren. Code/Link von Hand teilen:\n\n${tripId}\n${link}`);
  }
});

el("btn-leave-trip").addEventListener("click", () => {
  if (!confirm("Reise auf diesem Gerät verlassen? Die Daten bleiben in der Cloud erhalten, nur dieses Gerät verliert die Verknüpfung.")) return;
  sync.leaveTrip();
  location.reload();
});

settingsForm.addEventListener("submit", () => {
  ownerName = sOwner.value.trim();
  localStorage.setItem(OWNER_KEY, ownerName);
  sync.updateTripMeta({
    title: sTripTitle.value.trim(),
    currency: sCurrency.value,
  }).catch((err) => alert("Konnte nicht speichern: " + err.message));
});

/* ---------------------------------------------------------------------- */
/* Sync-Callbacks / Init                                                    */
/* ---------------------------------------------------------------------- */

function onTripData(data) {
  if (!data) return; // Reise existiert (noch) nicht / noch nicht synchronisiert
  trip.title = data.title || "";
  trip.currency = data.currency || "EUR";
  trip.categories = Array.isArray(data.categories) && data.categories.length
    ? data.categories
    : [...DEFAULT_CATEGORIES];
  renderHeader();
  populateCategorySelects();
  if (!settingsDialog.open) return;
  sTripTitle.value = trip.title;
  sCurrency.value = trip.currency;
  renderCategoryManageList();
}

function onExpenses(expenses) {
  trip.expenses = expenses;
  renderList();
  if (document.getElementById("tab-auswertung").classList.contains("active")) {
    renderAuswertung();
  }
}

function onConnectionChange(isSynced) {
  syncStatusEl.classList.toggle("synced", isSynced);
  syncStatusEl.title = isSynced
    ? "Synchronisiert"
    : "Offline oder wird gerade synchronisiert — Einträge sind lokal gespeichert und gehen nicht verloren.";
}

async function init() {
  if (!sync.isConfigured()) {
    obConfigWarning.hidden = false;
    el("btn-create-trip").disabled = true;
    el("btn-join-trip").disabled = true;
    showOnboarding();
    return;
  }

  await sync.initSync({ onTripData, onExpenses, onConnectionChange, onAuthError: () => {} });

  const params = new URLSearchParams(location.search);
  const urlCode = params.get("trip");
  if (urlCode) {
    history.replaceState(null, "", location.pathname);
  }

  if (sync.getStoredTripId()) {
    sync.resumeStoredTrip();
    showApp();
  } else if (urlCode) {
    const ok = await sync.joinTrip(urlCode);
    if (ok) {
      showApp();
    } else {
      showOnboarding();
      obJoinError.hidden = false;
    }
  } else {
    showOnboarding();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service Worker Registrierung fehlgeschlagen:", err);
    });
  }
}

init();
