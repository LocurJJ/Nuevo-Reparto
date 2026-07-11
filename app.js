const STORAGE_KEY = "panaderia-josue-reparto-v2";

const hoy = new Date().toISOString().slice(0, 10);
const estado = cargarEstado();

const $ = selector => document.querySelector(selector);
const el = {
  fecha: $("#fechaReparto"),
  nuevoDia: $("#nuevoDia"),
  exportar: $("#exportar"),
  importar: $("#importar"),
  vistaPc: $("#vistaPc"),
  vistaCelular: $("#vistaCelular"),
  vistaTabla: $("#vistaTabla"),
  vistaTarjetas: $("#vistaTarjetas"),
  totalVendido: $("#totalVendido"),
  efectivoTeorico: $("#efectivoTeorico"),
  efectivoReal: $("#efectivoReal"),
  totalGastos: $("#totalGastos"),
  diferencia: $("#diferencia"),
  deudaTotal: $("#deudaTotal"),
  formulaCierre: $("#formulaCierre"),
  formGasto: $("#formGasto"),
  detalleGasto: $("#detalleGasto"),
  montoGasto: $("#montoGasto"),
  tablaGastos: $("#tablaGastos"),
  formCliente: $("#formCliente"),
  nuevoClienteNombre: $("#nuevoClienteNombre"),
  nuevoClienteKg: $("#nuevoClienteKg"),
  precioPan: $("#precioPan"),
  precioFactura: $("#precioFactura"),
  tablaClientes: $("#tablaClientes")
};

el.fecha.value = estado.fechaActual;
el.precioPan.value = estado.config.precioPan;
el.precioFactura.value = estado.config.precioFactura;

el.fecha.addEventListener("change", () => {
  estado.fechaActual = el.fecha.value || hoy;
  asegurarDia(estado.fechaActual);
  guardar();
  render();
});
el.nuevoDia.addEventListener("click", crearNuevoDia);
el.exportar.addEventListener("click", exportarDatos);
el.importar.addEventListener("change", importarDatos);
el.vistaPc.addEventListener("click", () => cambiarVista("pc"));
el.vistaCelular.addEventListener("click", () => cambiarVista("celular"));
el.efectivoReal.addEventListener("input", () => {
  diaActual().efectivoReal = numero(el.efectivoReal.value);
  guardar();
  renderResumen();
});
el.precioPan.addEventListener("input", () => {
  estado.config.precioPan = numero(el.precioPan.value);
  guardar();
  render();
});
el.precioFactura.addEventListener("input", () => {
  estado.config.precioFactura = numero(el.precioFactura.value);
  guardar();
  render();
});
el.formGasto.addEventListener("submit", agregarGasto);
el.formCliente.addEventListener("submit", agregarCliente);

render();

function cargarEstado() {
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (guardado) {
    try {
      const data = JSON.parse(guardado);
      if (data && data.dias) return normalizarEstado(data);
    } catch {}
  }

  return normalizarEstado({
    fechaActual: hoy,
    vista: window.matchMedia("(max-width: 640px)").matches ? "celular" : "pc",
    config: { precioPan: 2200, precioFactura: 0 },
    dias: {
      [hoy]: {
        efectivoReal: 0,
        gastos: [],
        clientes: [
          clienteBase("Adolfina", 2),
          clienteBase("Antonia", 3),
          clienteBase("Maria", 3),
          clienteBase("Clara", 3),
          clienteBase("Mercedes", 3),
          clienteBase("Romero", 15)
        ]
      }
    }
  });
}

function normalizarEstado(data) {
  const base = {
    fechaActual: data.fechaActual || hoy,
    vista: data.vista || "pc",
    config: {
      precioPan: numero(data.config?.precioPan || 2200),
      precioFactura: numero(data.config?.precioFactura || 0)
    },
    dias: data.dias || {}
  };
  asegurarDia(base.fechaActual, base);
  Object.values(base.dias).forEach(dia => {
    dia.efectivoReal = numero(dia.efectivoReal);
    dia.gastos = Array.isArray(dia.gastos) ? dia.gastos : [];
    dia.clientes = Array.isArray(dia.clientes) ? dia.clientes.map(normalizarCliente) : [];
  });
  return base;
}

function clienteBase(nombre, kg = 0) {
  return normalizarCliente({ id: crypto.randomUUID(), nombre, kg });
}

function normalizarCliente(cliente) {
  return {
    id: cliente.id || crypto.randomUUID(),
    nombre: cliente.nombre || "",
    kg: numero(cliente.kg),
    enContra: numero(cliente.enContra),
    efectivo: numero(cliente.efectivo),
    mp: numero(cliente.mp),
    otros: numero(cliente.otros),
    facturas: numero(cliente.facturas),
    prepizzas: numero(cliente.prepizzas),
    panRallado: numero(cliente.panRallado),
    panMiga: numero(cliente.panMiga),
    observacion: cliente.observacion || ""
  };
}

function asegurarDia(fecha, target = estado) {
  if (!target.dias[fecha]) {
    target.dias[fecha] = { efectivoReal: 0, gastos: [], clientes: [] };
  }
}

function diaActual() {
  asegurarDia(estado.fechaActual);
  return estado.dias[estado.fechaActual];
}

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function crearNuevoDia() {
  const fechaAnterior = estado.fechaActual;
  const nuevaFecha = sumarDias(fechaAnterior, 1);
  if (estado.dias[nuevaFecha] && estado.dias[nuevaFecha].clientes.length) {
    if (!confirm(`El dia ${formatearFecha(nuevaFecha)} ya existe. Queres abrirlo?`)) return;
    estado.fechaActual = nuevaFecha;
    el.fecha.value = nuevaFecha;
    guardar();
    render();
    return;
  }

  const anterior = diaActual();
  estado.dias[nuevaFecha] = {
    efectivoReal: 0,
    gastos: [],
    clientes: anterior.clientes.map(cliente => {
      const cuenta = calcularCliente(cliente).cuenta;
      return normalizarCliente({
        id: crypto.randomUUID(),
        nombre: cliente.nombre,
        kg: cliente.kg,
        enContra: cuenta,
        efectivo: 0,
        mp: 0,
        otros: 0,
        facturas: 0,
        prepizzas: 0,
        panRallado: 0,
        panMiga: 0,
        observacion: ""
      });
    })
  };
  estado.fechaActual = nuevaFecha;
  el.fecha.value = nuevaFecha;
  guardar();
  render();
}

function agregarGasto(event) {
  event.preventDefault();
  const detalle = el.detalleGasto.value.trim();
  const monto = numero(el.montoGasto.value);
  if (!detalle || monto <= 0) return;
  diaActual().gastos.push({ id: crypto.randomUUID(), detalle, monto });
  el.formGasto.reset();
  guardar();
  render();
}

function agregarCliente(event) {
  event.preventDefault();
  const nombre = el.nuevoClienteNombre.value.trim();
  if (!nombre) return;
  diaActual().clientes.push(clienteBase(nombre, numero(el.nuevoClienteKg.value)));
  el.formCliente.reset();
  guardar();
  render();
}

function cambiarVista(vista) {
  estado.vista = vista;
  el.vistaPc.classList.toggle("activo", vista === "pc");
  el.vistaCelular.classList.toggle("activo", vista === "celular");
  el.vistaTabla.hidden = vista !== "pc";
  el.vistaTarjetas.hidden = vista !== "celular";
  guardar();
}

function render() {
  el.fecha.value = estado.fechaActual;
  el.efectivoReal.value = diaActual().efectivoReal || "";
  renderResumen();
  renderGastos();
  renderTabla();
  renderTarjetas();
  cambiarVista(estado.vista);
}

function renderResumen() {
  const resumen = calcularDia();
  el.totalVendido.textContent = moneda(resumen.totalVendido);
  el.efectivoTeorico.textContent = moneda(resumen.efectivoTeorico);
  el.totalGastos.textContent = moneda(resumen.gastos);
  el.deudaTotal.textContent = moneda(resumen.deuda);
  el.diferencia.textContent = moneda(resumen.diferencia);
  el.diferencia.classList.toggle("negativo", resumen.diferencia < 0);
  el.diferencia.classList.toggle("positivo", resumen.diferencia >= 0);
  el.formulaCierre.textContent = `Efectivo teorico: ${moneda(resumen.efectivoTeorico)} - Gastos: ${moneda(resumen.gastos)} - Esperado: ${moneda(resumen.esperado)}`;
}

function renderGastos() {
  const gastos = diaActual().gastos;
  el.tablaGastos.innerHTML = "";
  if (!gastos.length) {
    el.tablaGastos.innerHTML = '<tr><td class="vacio" colspan="3">Todavia no cargaste gastos.</td></tr>';
    return;
  }
  gastos.forEach(gasto => {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${esc(gasto.detalle)}</td><td>${moneda(gasto.monto)}</td><td><button class="eliminar" type="button">Borrar</button></td>`;
    fila.querySelector("button").addEventListener("click", () => {
      diaActual().gastos = gastos.filter(item => item.id !== gasto.id);
      guardar();
      render();
    });
    el.tablaGastos.append(fila);
  });
}

function renderTabla() {
  const clientes = diaActual().clientes;
  el.tablaClientes.innerHTML = "";
  if (!clientes.length) {
    el.tablaClientes.innerHTML = '<tr><td class="vacio" colspan="14">Agrega clientes para empezar el reparto.</td></tr>';
    return;
  }
  clientes.forEach(cliente => {
    const calc = calcularCliente(cliente);
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="celda-nombre"><input data-campo="nombre" value="${attr(cliente.nombre)}"></td>
      <td><input data-campo="kg" type="number" min="0" step="0.01" value="${cliente.kg}"></td>
      <td><input data-campo="enContra" type="number" step="1" value="${cliente.enContra}"></td>
      <td class="celda-debe">${moneda(calc.debe)}</td>
      <td><input data-campo="efectivo" type="number" min="0" step="1" value="${cliente.efectivo}"></td>
      <td><input data-campo="mp" type="number" min="0" step="1" value="${cliente.mp}"></td>
      <td class="celda-cuenta ${calc.cuenta > 0 ? "cuenta-deuda" : ""}">${moneda(calc.cuenta)}</td>
      <td><input data-campo="otros" type="number" min="0" step="1" value="${cliente.otros}"></td>
      <td><input data-campo="facturas" type="number" min="0" step="1" value="${cliente.facturas}"></td>
      <td><input data-campo="prepizzas" type="number" min="0" step="1" value="${cliente.prepizzas}"></td>
      <td><input data-campo="panRallado" type="number" min="0" step="1" value="${cliente.panRallado}"></td>
      <td><input data-campo="panMiga" type="number" min="0" step="1" value="${cliente.panMiga}"></td>
      <td><textarea data-campo="observacion">${esc(cliente.observacion)}</textarea></td>
      <td><button class="eliminar" type="button">Borrar</button></td>
    `;
    conectarFila(fila, cliente);
    el.tablaClientes.append(fila);
  });
}

function renderTarjetas() {
  const clientes = diaActual().clientes;
  el.vistaTarjetas.innerHTML = "";
  if (!clientes.length) {
    el.vistaTarjetas.innerHTML = '<div class="vacio">Agrega clientes para empezar el reparto.</div>';
    return;
  }
  clientes.forEach(cliente => {
    const calc = calcularCliente(cliente);
    const card = document.createElement("article");
    card.className = "cliente-card";
    card.innerHTML = `
      <div class="card-head">
        <input data-campo="nombre" value="${attr(cliente.nombre)}">
        <button class="eliminar" type="button">Borrar</button>
      </div>
      <div class="card-totales">
        <div><span>Debe</span><strong>${moneda(calc.debe)}</strong></div>
        <div><span>Cuenta</span><strong class="${calc.cuenta > 0 ? "negativo" : "positivo"}">${moneda(calc.cuenta)}</strong></div>
        <div><span>En contra</span><strong>${moneda(cliente.enContra)}</strong></div>
      </div>
      <div class="card-grid">
        ${inputCard("Kg", "kg", cliente.kg, "0.01")}
        ${inputCard("Efectivo", "efectivo", cliente.efectivo)}
        ${inputCard("MP", "mp", cliente.mp)}
        ${inputCard("Otros", "otros", cliente.otros)}
        ${inputCard("Facturas", "facturas", cliente.facturas)}
        ${inputCard("Prepizzas", "prepizzas", cliente.prepizzas)}
        ${inputCard("Pan rallado", "panRallado", cliente.panRallado)}
        ${inputCard("Pan para miga", "panMiga", cliente.panMiga)}
        <label class="card-wide">Observacion<textarea data-campo="observacion">${esc(cliente.observacion)}</textarea></label>
      </div>
    `;
    conectarFila(card, cliente);
    el.vistaTarjetas.append(card);
  });
}

function inputCard(label, campo, valor, step = "1") {
  return `<label>${label}<input data-campo="${campo}" type="number" min="0" step="${step}" value="${valor}"></label>`;
}

function conectarFila(contenedor, cliente) {
  contenedor.querySelectorAll("input[data-campo], textarea[data-campo]").forEach(input => {
    input.addEventListener("input", () => {
      const campo = input.dataset.campo;
      cliente[campo] = campo === "nombre" || campo === "observacion" ? input.value : numero(input.value);
      guardar();
      renderResumen();
    });
    input.addEventListener("change", render);
  });
  contenedor.querySelector("button.eliminar").addEventListener("click", () => {
    if (!confirm("Borrar este cliente del dia?")) return;
    diaActual().clientes = diaActual().clientes.filter(item => item.id !== cliente.id);
    guardar();
    render();
  });
}

function calcularDia() {
  const dia = diaActual();
  const totales = dia.clientes.reduce((acc, cliente) => {
    const calc = calcularCliente(cliente);
    acc.totalVendido += calc.ventaDia;
    acc.efectivoTeorico += cliente.efectivo;
    acc.mp += cliente.mp;
    acc.deuda += Math.max(calc.cuenta, 0);
    return acc;
  }, { totalVendido: 0, efectivoTeorico: 0, mp: 0, deuda: 0 });
  totales.gastos = dia.gastos.reduce((sum, gasto) => sum + numero(gasto.monto), 0);
  totales.esperado = totales.efectivoTeorico - totales.gastos;
  totales.diferencia = numero(dia.efectivoReal) + totales.gastos - totales.efectivoTeorico;
  return totales;
}

function calcularCliente(cliente) {
  const pan = numero(cliente.kg) * numero(estado.config.precioPan);
  const facturas = numero(cliente.facturas) * numero(estado.config.precioFactura);
  const ventaDia = pan + facturas + numero(cliente.otros) + numero(cliente.prepizzas) + numero(cliente.panRallado) + numero(cliente.panMiga);
  const debe = ventaDia + numero(cliente.enContra);
  const cuenta = debe - numero(cliente.efectivo) - numero(cliente.mp);
  return { pan, facturas, ventaDia, debe, cuenta };
}

function exportarDatos() {
  const blob = new Blob([JSON.stringify(estado, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reparto-panaderia-${estado.fechaActual}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importarDatos(event) {
  const archivo = event.target.files?.[0];
  if (!archivo) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = normalizarEstado(JSON.parse(reader.result));
      Object.assign(estado, data);
      guardar();
      render();
    } catch {
      alert("No se pudo importar. Usa un archivo exportado desde esta app.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(archivo);
}

function sumarDias(fecha, dias) {
  const [year, month, day] = fecha.split("-").map(Number);
  const date = new Date(year, month - 1, day + dias);
  return date.toISOString().slice(0, 10);
}

function formatearFecha(fecha) {
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function moneda(valor) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(numero(valor));
}

function esc(valor) {
  return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function attr(valor) {
  return esc(valor);
}
