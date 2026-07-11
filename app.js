const STORAGE_KEY = "nuevo-reparto-v1";

const state = {
  deliveries: loadDeliveries(),
  view: window.matchMedia("(max-width: 640px)").matches ? "mobile" : "desktop",
  search: "",
  status: "Todos"
};

const els = {
  form: document.querySelector("#deliveryForm"),
  deliveryId: document.querySelector("#deliveryId"),
  client: document.querySelector("#client"),
  address: document.querySelector("#address"),
  phone: document.querySelector("#phone"),
  zone: document.querySelector("#zone"),
  details: document.querySelector("#details"),
  driver: document.querySelector("#driver"),
  amount: document.querySelector("#amount"),
  payment: document.querySelector("#payment"),
  statusSelect: document.querySelector("#status"),
  notes: document.querySelector("#notes"),
  clearFormBtn: document.querySelector("#clearFormBtn"),
  desktopBtn: document.querySelector("#desktopViewBtn"),
  mobileBtn: document.querySelector("#mobileViewBtn"),
  desktopView: document.querySelector("#desktopView"),
  mobileView: document.querySelector("#mobileView"),
  table: document.querySelector("#deliveryTable"),
  cards: document.querySelector("#deliveryCards"),
  search: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  totalCount: document.querySelector("#totalCount"),
  pendingCount: document.querySelector("#pendingCount"),
  routeCount: document.querySelector("#routeCount"),
  deliveredCount: document.querySelector("#deliveredCount"),
  totalAmount: document.querySelector("#totalAmount"),
  emptyTemplate: document.querySelector("#emptyTemplate")
};

els.form.addEventListener("submit", saveFromForm);
els.clearFormBtn.addEventListener("click", resetForm);
els.desktopBtn.addEventListener("click", () => setView("desktop"));
els.mobileBtn.addEventListener("click", () => setView("mobile"));
els.search.addEventListener("input", event => {
  state.search = event.target.value.trim().toLowerCase();
  render();
});
els.statusFilter.addEventListener("change", event => {
  state.status = event.target.value;
  render();
});
els.exportBtn.addEventListener("click", exportData);
els.importInput.addEventListener("change", importData);

render();

function loadDeliveries() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      client: "Cliente de ejemplo",
      address: "Av. Principal 123",
      phone: "",
      zone: "Centro",
      details: "Pedido de prueba",
      driver: "",
      amount: 0,
      payment: "Efectivo",
      status: "Pendiente",
      notes: "Borrar o editar este reparto."
    }
  ];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.deliveries));
}

function saveFromForm(event) {
  event.preventDefault();
  const data = {
    id: els.deliveryId.value || crypto.randomUUID(),
    createdAt: els.deliveryId.value ? getExisting(els.deliveryId.value)?.createdAt || new Date().toISOString() : new Date().toISOString(),
    client: els.client.value.trim(),
    address: els.address.value.trim(),
    phone: els.phone.value.trim(),
    zone: els.zone.value.trim(),
    details: els.details.value.trim(),
    driver: els.driver.value.trim(),
    amount: Number(els.amount.value || 0),
    payment: els.payment.value,
    status: els.statusSelect.value,
    notes: els.notes.value.trim()
  };

  const existingIndex = state.deliveries.findIndex(item => item.id === data.id);
  if (existingIndex >= 0) {
    state.deliveries[existingIndex] = data;
  } else {
    state.deliveries.unshift(data);
  }

  persist();
  resetForm();
  render();
}

function getExisting(id) {
  return state.deliveries.find(item => item.id === id);
}

function resetForm() {
  els.form.reset();
  els.deliveryId.value = "";
  els.payment.value = "Efectivo";
  els.statusSelect.value = "Pendiente";
}

function editDelivery(id) {
  const item = getExisting(id);
  if (!item) return;
  els.deliveryId.value = item.id;
  els.client.value = item.client;
  els.address.value = item.address;
  els.phone.value = item.phone;
  els.zone.value = item.zone;
  els.details.value = item.details;
  els.driver.value = item.driver;
  els.amount.value = item.amount;
  els.payment.value = item.payment;
  els.statusSelect.value = item.status;
  els.notes.value = item.notes;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function removeDelivery(id) {
  if (!confirm("Eliminar este reparto?")) return;
  state.deliveries = state.deliveries.filter(item => item.id !== id);
  persist();
  render();
}

function changeStatus(id, status) {
  const item = getExisting(id);
  if (!item) return;
  item.status = status;
  persist();
  render();
}

function setView(view) {
  state.view = view;
  els.desktopView.hidden = view !== "desktop";
  els.mobileView.hidden = view !== "mobile";
  els.desktopBtn.classList.toggle("active", view === "desktop");
  els.mobileBtn.classList.toggle("active", view === "mobile");
}

function filteredDeliveries() {
  return state.deliveries.filter(item => {
    const matchesStatus = state.status === "Todos" || item.status === state.status;
    const haystack = [item.client, item.address, item.zone, item.driver, item.details, item.notes].join(" ").toLowerCase();
    return matchesStatus && haystack.includes(state.search);
  });
}

function render() {
  const items = filteredDeliveries();
  renderStats();
  renderTable(items);
  renderCards(items);
  setView(state.view);
}

function renderStats() {
  const totalAmount = state.deliveries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  els.totalCount.textContent = state.deliveries.length;
  els.pendingCount.textContent = countStatus("Pendiente");
  els.routeCount.textContent = countStatus("En camino");
  els.deliveredCount.textContent = countStatus("Entregado");
  els.totalAmount.textContent = formatMoney(totalAmount);
}

function countStatus(status) {
  return state.deliveries.filter(item => item.status === status).length;
}

function renderTable(items) {
  els.table.innerHTML = "";
  if (!items.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.append(emptyState());
    row.append(cell);
    els.table.append(row);
    return;
  }

  items.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${statusBadge(item.status)}</td>
      <td><strong>${escapeHtml(item.client)}</strong><br><small>${escapeHtml(item.details || "Sin detalle")}</small></td>
      <td>${escapeHtml(item.address)}${item.phone ? `<br><small>${escapeHtml(item.phone)}</small>` : ""}</td>
      <td>${escapeHtml(item.zone || "-")}</td>
      <td>${escapeHtml(item.driver || "-")}</td>
      <td>${formatMoney(item.amount)}</td>
      <td>${escapeHtml(item.payment)}</td>
      <td class="row-actions">
        <button type="button" data-action="route" data-id="${item.id}">En camino</button>
        <button type="button" data-action="done" data-id="${item.id}">Entregado</button>
        <button type="button" data-action="edit" data-id="${item.id}">Editar</button>
        <button type="button" data-action="delete" data-id="${item.id}">Borrar</button>
      </td>
    `;
    els.table.append(row);
  });

  els.table.querySelectorAll("button").forEach(button => button.addEventListener("click", handleAction));
}

function renderCards(items) {
  els.cards.innerHTML = "";
  if (!items.length) {
    els.cards.append(emptyState());
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "delivery-card";
    card.innerHTML = `
      <div class="card-head">
        <p class="card-title">${escapeHtml(item.client)}</p>
        ${statusBadge(item.status)}
      </div>
      <p class="card-line"><strong>Direccion:</strong> ${escapeHtml(item.address)}</p>
      <p class="card-line"><strong>Zona:</strong> ${escapeHtml(item.zone || "-")} · <strong>Importe:</strong> ${formatMoney(item.amount)}</p>
      ${item.details ? `<p class="card-line"><strong>Pedido:</strong> ${escapeHtml(item.details)}</p>` : ""}
      ${item.notes ? `<p class="card-line"><strong>Notas:</strong> ${escapeHtml(item.notes)}</p>` : ""}
      <div class="mobile-actions">
        <button class="route" type="button" data-action="route" data-id="${item.id}">En camino</button>
        <button class="done" type="button" data-action="done" data-id="${item.id}">Entregado</button>
        ${item.phone ? `<a href="tel:${escapeAttr(item.phone)}">Llamar</a>` : `<button type="button" disabled>Sin telefono</button>`}
        <button class="fail" type="button" data-action="fail" data-id="${item.id}">No entregado</button>
        <button type="button" data-action="edit" data-id="${item.id}">Editar</button>
        <button type="button" data-action="delete" data-id="${item.id}">Borrar</button>
      </div>
    `;
    els.cards.append(card);
  });

  els.cards.querySelectorAll("button[data-action]").forEach(button => button.addEventListener("click", handleAction));
}

function handleAction(event) {
  const { action, id } = event.currentTarget.dataset;
  if (action === "route") changeStatus(id, "En camino");
  if (action === "done") changeStatus(id, "Entregado");
  if (action === "fail") changeStatus(id, "No entregado");
  if (action === "edit") editDelivery(id);
  if (action === "delete") removeDelivery(id);
}

function statusBadge(status) {
  const className = status.toLowerCase().replaceAll(" ", "-");
  return `<span class="badge ${className}">${escapeHtml(status)}</span>`;
}

function emptyState() {
  return els.emptyTemplate.content.firstElementChild.cloneNode(true);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.deliveries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `repartos-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error("Formato invalido");
      state.deliveries = imported.map(item => ({ ...item, id: item.id || crypto.randomUUID() }));
      persist();
      render();
    } catch {
      alert("No se pudo importar el archivo. Tiene que ser un JSON exportado desde esta app.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll(" ", "");
}
