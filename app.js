const FIRST = 3326;
const LAST = 3400;
const PRICE = 200;
const STORAGE_KEY = "raffleLuxIphone17_v1";

let records = loadRecords();
let activeTicket = null;

const $ = (id) => document.getElementById(id);
const money = (value) => "RD$" + Number(value).toLocaleString("es-DO");
const allNumbers = () => Array.from({length: LAST - FIRST + 1}, (_, i) => FIRST + i);

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function ticketRecord(number) {
  return records.find(r => r.numbers.includes(number));
}
function statusName(status) {
  return status === "sold" ? "Vendida" : "Reservada";
}
function render() {
  const assigned = records.flatMap(r => r.numbers.map(number => ({number, status:r.status})));
  const sold = assigned.filter(x => x.status === "sold").length;
  const reserved = assigned.filter(x => x.status === "reserved").length;
  const available = LAST - FIRST + 1 - sold - reserved;
  const revenue = sold * PRICE;
  $("totalTickets").textContent = LAST - FIRST + 1;
  $("availableCount").textContent = available;
  $("reservedCount").textContent = reserved;
  $("soldCount").textContent = sold;
  $("revenue").textContent = money(revenue);
  $("progressText").textContent = `${Math.round(sold / (LAST - FIRST + 1) * 100)}% vendido`;
  $("progressBar").style.width = `${sold / (LAST - FIRST + 1) * 100}%`;
  renderGrid();
  renderRecords();
  updatePurchaseTotal();
}
function renderGrid() {
  const grid = $("ticketGrid");
  grid.innerHTML = "";
  allNumbers().forEach(number => {
    const record = ticketRecord(number);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ticket" + (record ? ` ${record.status}` : "") + (activeTicket === number ? " selected" : "");
    button.textContent = number;
    button.title = record ? `${statusName(record.status)} · ${record.name}` : "Disponible";
    button.addEventListener("click", () => openTicket(number));
    grid.appendChild(button);
  });
}
function renderRecords() {
  const body = $("recordsBody");
  const query = $("searchInput").value.trim().toLowerCase();
  body.innerHTML = "";
  const filtered = [...records].sort((a,b) => a.createdAt - b.createdAt).filter(r =>
    r.name.toLowerCase().includes(query) || r.phone.toLowerCase().includes(query) ||
    r.numbers.some(n => String(n).includes(query))
  );
  $("emptyRecords").style.display = filtered.length ? "none" : "block";
  if (query && !filtered.length) $("emptyRecords").textContent = "No se encontraron registros.";
  else $("emptyRecords").textContent = "Todavía no hay compradores registrados.";
  filtered.forEach(record => {
    const tr = document.createElement("tr");
    const values = [
      record.name, record.phone || "—", record.numbers.join(", "),
      money(record.numbers.length * PRICE), statusName(record.status)
    ];
    values.forEach((value, index) => {
      const td = document.createElement("td");
      if (index === 4) {
        const pill = document.createElement("span");
        pill.className = `status-pill ${record.status}`;
        pill.textContent = value;
        td.appendChild(pill);
      } else td.textContent = value;
      tr.appendChild(td);
    });
    const actions = document.createElement("td");
    actions.innerHTML = `<div class="row-actions"><button class="small-action" data-action="toggle">${record.status === "reserved" ? "Confirmar pago" : "A reserva"}</button><button class="small-action delete" data-action="delete">Eliminar</button></div>`;
    actions.querySelector('[data-action="toggle"]').addEventListener("click", () => {
      record.status = record.status === "reserved" ? "sold" : "reserved";
      saveRecords(); render();
    });
    actions.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (confirm(`¿Eliminar el registro de ${record.name}? Sus boletas volverán a estar disponibles.`)) {
        records = records.filter(r => r.id !== record.id);
        saveRecords(); render();
      }
    });
    tr.appendChild(actions);
    body.appendChild(tr);
  });
}
function parseNumbers(value) {
  const parts = value.split(/[,\s;]+/).filter(Boolean);
  if (!parts.length) throw new Error("Escribe al menos un número de boleta.");
  const nums = parts.map(part => {
    if (!/^\d+$/.test(part)) throw new Error(`El valor "${part}" no es un número válido.`);
    return Number(part);
  });
  if (new Set(nums).size !== nums.length) throw new Error("Hay números repetidos en esta compra.");
  for (const n of nums) {
    if (n < FIRST || n > LAST) throw new Error(`La boleta ${n} está fuera del rango ${FIRST}–${LAST}.`);
    if (ticketRecord(n)) throw new Error(`La boleta ${n} ya está ${ticketRecord(n).status === "sold" ? "vendida" : "reservada"}.`);
  }
  return nums.sort((a,b) => a-b);
}
function updatePurchaseTotal() {
  const count = $("ticketNumbers").value.split(/[,\s;]+/).filter(Boolean).length;
  $("purchaseTotal").textContent = money(count * PRICE);
}
$("ticketNumbers").addEventListener("input", updatePurchaseTotal);
$("ticketForm").addEventListener("submit", event => {
  event.preventDefault();
  const message = $("formMessage");
  message.classList.remove("error");
  try {
    const name = $("buyerName").value.trim();
    if (!name) throw new Error("Escribe el nombre del comprador.");
    const numbers = parseNumbers($("ticketNumbers").value);
    records.push({
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
      name,
      phone: $("buyerPhone").value.trim(),
      numbers,
      status: $("ticketStatus").value,
      createdAt: Date.now()
    });
    saveRecords();
    $("ticketForm").reset();
    updatePurchaseTotal();
    message.textContent = "Registro guardado correctamente.";
    render();
  } catch (error) {
    message.textContent = error.message;
    message.classList.add("error");
  }
});
$("searchInput").addEventListener("input", renderRecords);

function openTicket(number) {
  activeTicket = number;
  const record = ticketRecord(number);
  $("dialogTicketNumber").textContent = `Boleta ${number}`;
  const details = $("dialogDetails");
  if (!record) {
    details.innerHTML = `<p>Estado: <strong style="color:#9b9b9b">Disponible</strong></p><p>Precio: <strong>${money(PRICE)}</strong></p>`;
    $("markReserved").style.display = "none";
    $("markSold").style.display = "none";
    $("releaseTicket").style.display = "none";
  } else {
    details.innerHTML = `<p>Comprador: <strong>${escapeHTML(record.name)}</strong></p><p>Teléfono: <strong>${escapeHTML(record.phone || "No indicado")}</strong></p><p>Boletas de esta compra: <strong>${record.numbers.join(", ")}</strong></p><p>Estado: <strong>${statusName(record.status)}</strong></p><p>Total de la compra: <strong>${money(record.numbers.length * PRICE)}</strong></p>`;
    $("markReserved").style.display = record.status === "sold" ? "inline-block" : "none";
    $("markSold").style.display = record.status === "reserved" ? "inline-block" : "none";
    $("releaseTicket").style.display = "inline-block";
  }
  $("ticketDialog").showModal();
  renderGrid();
}
function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function updateActive(status) {
  const record = ticketRecord(activeTicket);
  if (!record) return;
  record.status = status;
  saveRecords(); $("ticketDialog").close(); render();
}
$("markReserved").addEventListener("click", () => updateActive("reserved"));
$("markSold").addEventListener("click", () => updateActive("sold"));
$("releaseTicket").addEventListener("click", () => {
  const record = ticketRecord(activeTicket);
  if (!record) return;
  if (confirm(`¿Liberar la boleta ${activeTicket}? Se eliminará toda la compra de ${record.name}.`)) {
    records = records.filter(r => r.id !== record.id);
    saveRecords(); $("ticketDialog").close(); render();
  }
});
$("exportButton").addEventListener("click", () => {
  const rows = [["Comprador","Telefono","Boletas","Cantidad","Total_RD","Estado","Fecha"]];
  records.forEach(r => rows.push([r.name,r.phone,r.numbers.join(" "),r.numbers.length,r.numbers.length*PRICE,statusName(r.status),new Date(r.createdAt).toLocaleString("es-DO")]));
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadFile(new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8;"}), "registros-rifa-iphone.csv");
});
$("backupButton").addEventListener("click", () => {
  downloadFile(new Blob([JSON.stringify(records,null,2)], {type:"application/json"}), "copia-seguridad-rifa.json");
});
$("importInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error();
    const seen = new Set();
    imported.forEach(r => {
      if (!r.name || !Array.isArray(r.numbers) || !["sold","reserved"].includes(r.status)) throw new Error();
      r.numbers.forEach(n => {
        if (!Number.isInteger(n) || n < FIRST || n > LAST || seen.has(n)) throw new Error();
        seen.add(n);
      });
    });
    if (confirm("Importar reemplazará los registros actuales. ¿Deseas continuar?")) {
      records = imported; saveRecords(); render();
    }
  } catch { alert("No se pudo importar. Verifica que sea una copia válida de esta aplicación."); }
  event.target.value = "";
});
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
render();
