const API_BASE = "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json";

const $ticket = document.getElementById("ticket");
const $fecha = document.getElementById("fecha");
const $keywords = document.getElementById("keywords");
const $btn = document.getElementById("buscarBtn");
const $status = document.getElementById("status");
const $body = document.getElementById("resultsBody");
const $estadoToggles = document.getElementById("estadoToggles");

function todayISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoToDDMMYYYY(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}${m}${y}`;
}

function setStatus(msg, isError) {
  $status.textContent = msg;
  $status.className = "status" + (isError ? " error" : "");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return "";
}

const CODIGOESTADO_MAP = {
  5: "Publicada",
  6: "Cerrada",
  11: "Cerrada",
  12: "Cerrada",
  13: "Cerrada",
  14: "Cerrada",
  7: "Desierta",
  8: "Adjudicada",
  9: "Adjudicada",
  10: "Adjudicada",
  15: "Revocada",
  16: "Suspendida",
};

function estadoFromCodigo(codigoEstado) {
  return CODIGOESTADO_MAP[Number(codigoEstado)] || "Desconocido";
}

function renderRows(items) {
  if (!items.length) {
    $body.innerHTML = `<tr><td colspan="4" class="empty">No hay licitaciones que coincidan con el filtro.</td></tr>`;
    return;
  }

  $body.innerHTML = items.map(item => {
    const codigo = pick(item, ["CodigoExterno"]);
    const nombre = pick(item, ["Nombre"]);
    const estado = estadoFromCodigo(item.CodigoEstado);
    const cierre = pick(item, ["FechaCierre"]);

    return `<tr>
      <td>${escapeHtml(codigo)}</td>
      <td>${escapeHtml(nombre)}</td>
      <td><span class="badge">${escapeHtml(estado)}</span></td>
      <td>${escapeHtml(cierre)}</td>
    </tr>`;
  }).join("");
}

function filterByKeywords(items, rawKeywords) {
  const keywords = rawKeywords
    .split(",")
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  if (!keywords.length) return items;

  return items.filter(item => {
    const haystack = pick(item, ["Nombre"]).toLowerCase();
    return keywords.some(k => haystack.includes(k));
  });
}

function getSelectedStates() {
  return Array.from($estadoToggles.querySelectorAll("input:checked")).map(i => i.value.toLowerCase());
}

function filterByStates(items, selectedStates) {
  if (!selectedStates.length) return items;

  return items.filter(item => selectedStates.includes(estadoFromCodigo(item.CodigoEstado).toLowerCase()));
}

async function buscarLicitaciones() {
  const ticket = $ticket.value.trim();
  const fechaISO = $fecha.value;

  if (!ticket) {
    setStatus("Debes ingresar tu ticket de la API de Mercado Público.", true);
    return;
  }
  if (!fechaISO) {
    setStatus("Debes seleccionar una fecha.", true);
    return;
  }

  localStorage.setItem("mp_ticket", ticket);

  const fecha = isoToDDMMYYYY(fechaISO);
  const url = `${API_BASE}?fecha=${fecha}&ticket=${encodeURIComponent(ticket)}`;

  $btn.disabled = true;
  setStatus("Consultando licitaciones...", false);
  $body.innerHTML = `<tr><td colspan="4" class="empty">Cargando...</td></tr>`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`La API respondió con estado ${res.status}`);
    }

    const data = await res.json();
    const listado = data.Listado || data.listado || [];
    const porEstado = filterByStates(listado, getSelectedStates());
    const filtrados = filterByKeywords(porEstado, $keywords.value);

    renderRows(filtrados);
    setStatus(`${filtrados.length} de ${listado.length} licitaciones publicadas el ${fechaISO}.`, false);
  } catch (err) {
    $body.innerHTML = `<tr><td colspan="4" class="empty">Error al consultar la API.</td></tr>`;
    setStatus(
      "Error: " + err.message + ". Si ves un error de red/CORS, la API de Mercado Público podría bloquear " +
      "solicitudes directas desde el navegador; en ese caso se requiere un pequeño proxy backend.",
      true
    );
  } finally {
    $btn.disabled = false;
  }
}

$btn.addEventListener("click", buscarLicitaciones);
$keywords.addEventListener("keydown", e => { if (e.key === "Enter") buscarLicitaciones(); });

$estadoToggles.querySelectorAll("input[type=checkbox]").forEach(input => {
  input.addEventListener("change", () => {
    input.closest(".toggle-chip").classList.toggle("active", input.checked);
  });
});

window.addEventListener("DOMContentLoaded", () => {
  $fecha.value = todayISO();
  const saved = localStorage.getItem("mp_ticket");
  if (saved) $ticket.value = saved;
});
