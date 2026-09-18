"use strict";

/* =========================================================================
   Urlaubsabrechnung — reine Client-App, alle Daten in localStorage.
   Kein Backend, kein Live-Sync zwischen Geräten — mehrere Geräte (z.B.
   zwei Partner-Handys) werden über JSON-Export + "Zusammenführen"-Import
   kombiniert (siehe README).
   ========================================================================= */

const STORAGE_KEY = "urlaubsabrechnung_v1";

const DEFAULT_CATEGORIES = [
  "Unterkunft",
  "Essen & Trinken",
  "Transport",
  "Aktivitäten",
  "Einkäufe",
  "Sonstiges",
];

const CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "JPY", "SEK", "NOK", "DKK",
  "PLN", "CZK", "HUF", "TRY", "THB", "AUD", "CAD",
];

const CHART_COLOR_VARS = [
  "--chart-1", "--chart-2", "--chart-3", "--chart-4",
  "--chart-5", "--chart-6", "--chart-7", "--chart-8",
];

function defaultState() {
  return {
    tripTitle: "",
    currency: "EUR",
    owner: "", // optionaler Name, taggt neue Einträge dieses Geräts
    categories: [...DEFAULT_CATEGORIES],
    expenses: [], // {id, amount, category, date (YYYY-MM-DD), note, owner, createdAt}
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // defensive merge in case of older/partial data
    return {
      ...defaultState(),
      ...parsed,
      categories: Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories
        : [...DEFAULT_CATEGORIES],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    };
  } catch (err) {
    console.error("Konnte gespeicherte Daten nicht lesen, starte leer.", err);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

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
    currency: state.currency,
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

/* ---------------------------------------------------------------------- */
/* DOM refs                                                                */
/* ---------------------------------------------------------------------- */

const el = (id) => document.getElementById(id);

const tripTitleDisplay = el("trip-title-display");
const tabsNav = el("tabs");
const tabPanels = document.querySelectorAll(".tab-panel");

const expenseForm = el("expense-form");
const fAmount = el("f-amount");
const fCurrencyLabel = el("f-currency-label");
const fCategory = el("f-category");
const fDate = el("f-date");
const fNote = el("f-note");
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

  fCategory.innerHTML = state.categories
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join("");

  filterCategory.innerHTML =
    `<option value="">Alle Kategorien</option>` +
    state.categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  selects.forEach((s, i) => {
    if (prevValues[i] && [...s.options].some((o) => o.value === prevValues[i])) {
      s.value = prevValues[i];
    }
  });
}

function populateCurrencySelect() {
  sCurrency.innerHTML = CURRENCIES.map(
    (c) => `<option value="${c}">${c}</option>`
  ).join("");
  sCurrency.value = state.currency;
}

function getOwnerList() {
  // stabile, alphabetische Reihenfolge — unabhängig davon, wer zuerst importiert/eingetragen hat
  const owners = new Set(state.expenses.map((x) => x.owner).filter(Boolean));
  return [...owners].sort((a, b) => a.localeCompare(b, "de"));
}

function populateOwnerFilter() {
  const owners = getOwnerList();
  const prev = filterOwner.value;
  if (owners.length < 2) {
    // nur relevant, sobald Einträge von mehr als einer Person vorliegen
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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---------------------------------------------------------------------- */
/* Header / labels                                                         */
/* ---------------------------------------------------------------------- */

function renderHeader() {
  tripTitleDisplay.textContent = state.tripTitle || "Urlaubsabrechnung";
  fCurrencyLabel.textContent = state.currency;
}

/* ---------------------------------------------------------------------- */
/* Erfassen                                                                 */
/* ---------------------------------------------------------------------- */

fDate.value = todayISO();

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat(fAmount.value.replace(",", "."));
  if (!isFinite(amount) || amount <= 0) return;

  state.expenses.push({
    id: uid(),
    amount: Math.round(amount * 100) / 100,
    category: fCategory.value,
    date: fDate.value || todayISO(),
    note: fNote.value.trim().slice(0, 200),
    owner: state.owner || "",
    createdAt: Date.now(),
  });
  saveState();

  fAmount.value = "";
  fNote.value = "";
  fAmount.focus();

  saveHint.hidden = false;
  clearTimeout(saveHint._t);
  saveHint._t = setTimeout(() => { saveHint.hidden = true; }, 1600);

  renderList();
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
  return state.expenses
    .filter((x) => (cat ? x.category === cat : true))
    .filter((x) => (owner ? x.owner === owner : true))
    .filter((x) => (q ? x.note.toLowerCase().includes(q) : true))
    .sort(sorter);
}

function categoryColor(category) {
  const idx = state.categories.indexOf(category);
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
      <button class="del-btn" aria-label="Löschen" data-del="${x.id}">🗑</button>
    </li>
  `).join("");
}

expenseListEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-del]");
  if (!btn) return;
  const id = btn.dataset.del;
  const idx = state.expenses.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const item = state.expenses[idx];
  if (!confirm(`Eintrag "${item.category} · ${fmtMoney(item.amount)}" löschen?`)) return;
  state.expenses.splice(idx, 1);
  saveState();
  renderList();
});

filterSearch.addEventListener("input", renderList);
filterCategory.addEventListener("change", renderList);
filterOwner.addEventListener("change", renderList);
sortOrder.addEventListener("change", renderList);

/* ---------------------------------------------------------------------- */
/* Auswertung                                                               */
/* ---------------------------------------------------------------------- */

function renderAuswertung() {
  const expenses = state.expenses;
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
/* Export / Import                                                         */
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

el("btn-export-csv").addEventListener("click", () => {
  const header = ["Datum", "Kategorie", "Betrag", "Währung", "Person", "Notiz"];
  const rows = [...state.expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x) => [x.date, x.category, x.amount.toFixed(2), state.currency, x.owner, x.note].map(csvEscape).join(";"));
  const csv = [header.join(";"), ...rows].join("\r\n");
  downloadBlob("﻿" + csv, `urlaubsausgaben-${slug(state.tripTitle)}.csv`, "text/csv;charset=utf-8");
});

function csvEscape(v) {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

el("btn-export-json").addEventListener("click", () => {
  downloadBlob(
    JSON.stringify(state, null, 2),
    `urlaubsabrechnung-backup-${slug(state.tripTitle)}.json`,
    "application/json"
  );
});

el("btn-merge-json").addEventListener("click", () => el("merge-file-input").click());

el("merge-file-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.expenses)) throw new Error("Ungültiges Format");

    const existingIds = new Set(state.expenses.map((x) => x.id));
    const newOnes = parsed.expenses.filter((x) => x && x.id && !existingIds.has(x.id));

    if (!newOnes.length) {
      alert("Keine neuen Einträge in dieser Datei — alles bereits vorhanden.");
      return;
    }

    let warning = "";
    if (parsed.currency && parsed.currency !== state.currency) {
      warning = `\n\nAchtung: Die Datei nutzt "${parsed.currency}", dieses Gerät "${state.currency}". Die Summen in der Auswertung werden dann NICHT stimmen — vorher auf beiden Geräten dieselbe Währung einstellen.`;
    }

    if (!confirm(`${newOnes.length} neue Einträge dazuladen (bestehende ${state.expenses.length} bleiben erhalten)?${warning}`)) return;

    state.expenses.push(...newOnes);
    if (Array.isArray(parsed.categories)) {
      for (const c of parsed.categories) {
        if (!state.categories.includes(c)) state.categories.push(c);
      }
    }
    saveState();
    refreshAll();
    alert(`${newOnes.length} Einträge zusammengeführt.`);
  } catch (err) {
    alert("Konnte Datei nicht zusammenführen: " + err.message);
  }
});

el("btn-import-json").addEventListener("click", () => el("import-file-input").click());

el("import-file-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.expenses)) throw new Error("Ungültiges Format");
    if (!confirm("Backup importieren? Das ersetzt alle aktuell gespeicherten Daten.")) return;
    state = {
      ...defaultState(),
      ...parsed,
      categories: Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories
        : [...DEFAULT_CATEGORIES],
    };
    saveState();
    refreshAll();
    alert("Backup importiert.");
  } catch (err) {
    alert("Konnte Datei nicht importieren: " + err.message);
  }
});

el("btn-clear-all").addEventListener("click", () => {
  if (!confirm("Wirklich ALLE Ausgaben und Einstellungen löschen? Das kann nicht rückgängig gemacht werden.")) return;
  state = defaultState();
  saveState();
  refreshAll();
});

/* ---------------------------------------------------------------------- */
/* Settings dialog                                                         */
/* ---------------------------------------------------------------------- */

el("btn-settings").addEventListener("click", () => {
  sTripTitle.value = state.tripTitle;
  sOwner.value = state.owner;
  populateCurrencySelect();
  renderCategoryManageList();
  settingsDialog.showModal();
});

function renderCategoryManageList() {
  categoryManageList.innerHTML = state.categories.map((c, i) => `
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
  if (state.categories.length <= 1) {
    alert("Mindestens eine Kategorie muss bestehen bleiben.");
    return;
  }
  const removed = state.categories[idx];
  const inUse = state.expenses.some((x) => x.category === removed);
  if (inUse && !confirm(`"${removed}" wird noch bei bestehenden Einträgen verwendet. Trotzdem aus der Liste entfernen? Bestehende Einträge behalten den Namen.`)) {
    return;
  }
  state.categories.splice(idx, 1);
  renderCategoryManageList();
});

function addCategoryFromInput() {
  const name = sNewCategory.value.trim();
  if (!name) return;
  if (state.categories.includes(name)) {
    alert("Diese Kategorie gibt es schon.");
    return;
  }
  state.categories.push(name);
  sNewCategory.value = "";
  renderCategoryManageList();
}

el("btn-add-category").addEventListener("click", addCategoryFromInput);
sNewCategory.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // avoid submitting/closing the <dialog> form
    addCategoryFromInput();
  }
});

settingsForm.addEventListener("submit", () => {
  state.tripTitle = sTripTitle.value.trim();
  state.owner = sOwner.value.trim();
  state.currency = sCurrency.value;
  saveState();
  refreshAll();
});

/* ---------------------------------------------------------------------- */
/* Init                                                                     */
/* ---------------------------------------------------------------------- */

function refreshAll() {
  renderHeader();
  populateCategorySelects();
  renderList();
  if (document.getElementById("tab-auswertung").classList.contains("active")) {
    renderAuswertung();
  }
}

refreshAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service Worker Registrierung fehlgeschlagen:", err);
    });
  });
}
