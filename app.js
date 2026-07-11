const STORAGE_KEY = "panaderia-josue-reparto-v3";
const OLD_KEYS = ["panaderia-josue-reparto-v2", "nuevo-reparto-v1"];
const REPORT_PASSWORD = "43315685";
const hoy = new Date().toISOString().slice(0, 10);
const page = document.body.dataset.page || "inicio";
const estado = cargarEstado();

const $ = selector => document.querySelector(selector);

if (page === "reparto") iniciarReparto();
if (page === "configuracion") iniciarConfiguracion();
if (page === "reportes") iniciarReportes();

function cargarEstado() {
  const raw = localStorage.getItem(STORAGE_KEY) || OLD_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
  if (raw) {
    try {
      return normalizarEstado(JSON.parse(raw));
    } catch {}
  }
  return normalizarEstado({
    fechaActual: hoy,
    vista: window.matchMedia("(max-width: 640px)").matches ? "celular" : "pc",
    config: {
      products: productosBase(),
      clients: clientesBase()
    },
    dias: {
      [hoy]: { efectivoReal: 0, gastos: [], clientes: clientesBase().map(clienteDesdeConfig) }
    }
  });
}

function normalizarEstado(data) {
  const configAnterior = data.config || {};
  const products = Array.isArray(configAnterior.products) ? configAnterior.products : productosBase(configAnterior);
  const clients = Array.isArray(configAnterior.clients) ? configAnterior.clients : clientesDesdeDias(data.dias);
  const base = {
    fechaActual: data.fechaActual || hoy,
    vista: data.vista || "pc",
    config: {
      products: products.map(normalizarProducto),
      clients: clients.length ? clients.map(normalizarClienteConfig) : clientesBase()
    },
    dias: data.dias || {}
  };
  asegurarDia(base.fechaActual, base);
  Object.values(base.dias).forEach(dia => {
    dia.efectivoReal = numero(dia.efectivoReal);
    dia.gastos = Array.isArray(dia.gastos) ? dia.gastos : [];
    dia.clientes = Array.isArray(dia.clientes) ? dia.clientes.map(normalizarClienteReparto) : [];
  });
  guardar(base);
  return base;
}

function productosBase(config = {}) {
  return [
    { id: "pan", nombre: "Pan", precio: numero(config.precioPan || 2200), fijo: true },
    { id: "factura", nombre: "Factura", precio: numero(config.precioFactura || 0), fijo: true },
    { id: "prepizzas", nombre: "Prepizzas", precio: 0, fijo: true },
    { id: "panRallado", nombre: "Pan rallado", precio: 0, fijo: true },
    { id: "panMiga", nombre: "Pan para miga", precio: 0, fijo: true },
    { id: "otros", nombre: "Otros", precio: 0, fijo: true }
  ];
}

function clientesBase() {
  return ["Adolfina", "Antonia", "Maria", "Clara", "Mercedes", "Romero"].map((nombre, index) => ({
    id: crypto.randomUUID(), nombre, kg: nombre === "Romero" ? 15 : index === 0 ? 2 : 3, orden: index + 1
  }));
}

function clientesDesdeDias(dias = {}) {
  const primerDia = Object.values(dias)[0];
  if (!primerDia?.clientes?.length) return [];
  return primerDia.clientes.map((cliente, index) => ({
    id: crypto.randomUUID(), nombre: cliente.nombre, kg: numero(cliente.kg), orden: index + 1
  }));
}

function normalizarProducto(producto) {
  return {
    id: producto.id || slug(producto.nombre) || crypto.randomUUID(),
    nombre: producto.nombre || "Producto",
    precio: numero(producto.precio),
    fijo: Boolean(producto.fijo)
  };
}

function normalizarClienteConfig(cliente) {
  return {
    id: cliente.id || crypto.randomUUID(),
    nombre: cliente.nombre || "",
    kg: numero(cliente.kg),
    orden: numero(cliente.orden) || 999
  };
}

function normalizarClienteReparto(cliente) {
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

function clienteDesdeConfig(cliente) {
  return normalizarClienteReparto({ nombre: cliente.nombre, kg: cliente.kg });
}

function asegurarDia(fecha, target = estado) {
  if (!target.dias[fecha]) {
    target.dias[fecha] = {
      efectivoReal: 0,
      gastos: [],
      clientes: target.config.clients.slice().sort((a, b) => a.orden - b.orden).map(clienteDesdeConfig)
    };
  }
}

function diaActual() {
  asegurarDia(estado.fechaActual);
  return estado.dias[estado.fechaActual];
}

function guardar(target = estado) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
}

function precio(id) {
  return numero(estado.config.products.find(producto => producto.id === id)?.precio);
}

function iniciarReparto() {
  const el = {
    fecha: $("#fechaReparto"), nuevoDia: $("#nuevoDia"), exportar: $("#exportar"), importar: $("#importar"),
    vistaPc: $("#vistaPc"), vistaCelular: $("#vistaCelular"), vistaTabla: $("#vistaTabla"), vistaTarjetas: $("#vistaTarjetas"),
    totalVendido: $("#totalVendido"), efectivoTeorico: $("#efectivoTeorico"), efectivoReal: $("#efectivoReal"), totalGastos: $("#totalGastos"), diferencia: $("#diferencia"), deudaTotal: $("#deudaTotal"), formulaCierre: $("#formulaCierre"),
    formGasto: $("#formGasto"), detalleGasto: $("#detalleGasto"), montoGasto: $("#montoGasto"), tablaGastos: $("#tablaGastos"),
    formCliente: $("#formCliente"), nuevoClienteNombre: $("#nuevoClienteNombre"), nuevoClienteKg: $("#nuevoClienteKg"), tablaClientes: $("#tablaClientes"),
    precioPanTexto: $("#precioPanTexto"), precioFacturaTexto: $("#precioFacturaTexto")
  };

  el.fecha.addEventListener("change", () => { estado.fechaActual = el.fecha.value || hoy; asegurarDia(estado.fechaActual); guardar(); render(); });
  el.nuevoDia.addEventListener("click", crearNuevoDia);
  el.exportar.addEventListener("click", exportarDatos);
  el.importar.addEventListener("change", importarDatos);
  el.vistaPc.addEventListener("click", () => cambiarVista("pc"));
  el.vistaCelular.addEventListener("click", () => cambiarVista("celular"));
  el.efectivoReal.addEventListener("input", () => { diaActual().efectivoReal = numero(el.efectivoReal.value); guardar(); renderResumen(); });
  el.formGasto.addEventListener("submit", agregarGasto);
  el.formCliente.addEventListener("submit", agregarCliente);
  render();

  function crearNuevoDia() {
    const nuevaFecha = sumarDias(estado.fechaActual, 1);
    if (estado.dias[nuevaFecha]?.clientes?.length) {
      if (!confirm(`El dia ${formatearFecha(nuevaFecha)} ya existe. Queres abrirlo?`)) return;
      estado.fechaActual = nuevaFecha;
      guardar();
      render();
      return;
    }
    const anterior = diaActual();
    estado.dias[nuevaFecha] = {
      efectivoReal: 0,
      gastos: [],
      clientes: anterior.clientes.map(cliente => normalizarClienteReparto({
        nombre: cliente.nombre, kg: cliente.kg, enContra: calcularCliente(cliente).cuenta
      }))
    };
    estado.fechaActual = nuevaFecha;
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
    const kg = numero(el.nuevoClienteKg.value);
    diaActual().clientes.push(normalizarClienteReparto({ nombre, kg }));
    if (!estado.config.clients.some(cliente => cliente.nombre.toLowerCase() === nombre.toLowerCase())) {
      estado.config.clients.push({ id: crypto.randomUUID(), nombre, kg, orden: estado.config.clients.length + 1 });
    }
    el.formCliente.reset();
    guardar();
    render();
  }

  function cambiarVista(vista) {
    const vistaFinal = window.matchMedia("(max-width: 640px)").matches ? "celular" : vista;
    estado.vista = vistaFinal;
    el.vistaPc.classList.toggle("activo", vistaFinal === "pc");
    el.vistaCelular.classList.toggle("activo", vistaFinal === "celular");
    el.vistaTabla.hidden = vistaFinal !== "pc";
    el.vistaTarjetas.hidden = vistaFinal !== "celular";
    guardar();
  }

  function render() {
    el.fecha.value = estado.fechaActual;
    el.efectivoReal.value = diaActual().efectivoReal || "";
    el.precioPanTexto.textContent = moneda(precio("pan"));
    el.precioFacturaTexto.textContent = moneda(precio("factura"));
    renderResumen();
    renderGastos();
    renderTabla();
    renderTarjetas();
    cambiarVista(estado.vista);
  }

  function renderResumen() {
    const resumen = calcularDia(diaActual());
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
    el.tablaGastos.innerHTML = gastos.length ? "" : '<tr><td class="vacio" colspan="3">Todavia no cargaste gastos.</td></tr>';
    gastos.forEach(gasto => {
      const fila = document.createElement("tr");
      fila.innerHTML = `<td>${esc(gasto.detalle)}</td><td>${moneda(gasto.monto)}</td><td><button class="eliminar" type="button">Borrar</button></td>`;
      fila.querySelector("button").addEventListener("click", () => { diaActual().gastos = gastos.filter(item => item.id !== gasto.id); guardar(); render(); });
      el.tablaGastos.append(fila);
    });
  }

  function renderTabla() {
    const clientes = diaActual().clientes;
    el.tablaClientes.innerHTML = clientes.length ? "" : '<tr><td class="vacio" colspan="14">Agrega clientes para empezar el reparto.</td></tr>';
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
        <td><button class="eliminar" type="button">Borrar</button></td>`;
      conectarFila(fila, cliente, render);
      el.tablaClientes.append(fila);
    });
  }

  function renderTarjetas() {
    const clientes = diaActual().clientes;
    el.vistaTarjetas.innerHTML = clientes.length ? "" : '<div class="vacio">Agrega clientes para empezar el reparto.</div>';
    clientes.forEach(cliente => {
      const calc = calcularCliente(cliente);
      const card = document.createElement("article");
      card.className = "cliente-card";
      card.innerHTML = `
        <div class="card-head"><input data-campo="nombre" value="${attr(cliente.nombre)}"><button class="eliminar" type="button">Borrar</button></div>
        <div class="card-totales"><div><span>Debe</span><strong>${moneda(calc.debe)}</strong></div><div><span>Cuenta</span><strong class="${calc.cuenta > 0 ? "negativo" : "positivo"}">${moneda(calc.cuenta)}</strong></div><div><span>En contra</span><strong>${moneda(cliente.enContra)}</strong></div></div>
        <div class="card-grid">${inputCard("Kg", "kg", cliente.kg, "0.01")}${inputCard("Efectivo", "efectivo", cliente.efectivo)}${inputCard("MP", "mp", cliente.mp)}${inputCard("Otros", "otros", cliente.otros)}${inputCard("Facturas", "facturas", cliente.facturas)}${inputCard("Prepizzas", "prepizzas", cliente.prepizzas)}${inputCard("Pan rallado", "panRallado", cliente.panRallado)}${inputCard("Pan para miga", "panMiga", cliente.panMiga)}<label class="card-wide">Observacion<textarea data-campo="observacion">${esc(cliente.observacion)}</textarea></label></div>`;
      conectarFila(card, cliente, render);
      el.vistaTarjetas.append(card);
    });
  }

  function conectarFila(contenedor, cliente, rerender) {
    contenedor.querySelectorAll("input[data-campo], textarea[data-campo]").forEach(input => {
      input.addEventListener("input", () => {
        const campo = input.dataset.campo;
        cliente[campo] = campo === "nombre" || campo === "observacion" ? input.value : numero(input.value);
        guardar();
        renderResumen();
      });
      input.addEventListener("change", rerender);
    });
    contenedor.querySelector("button.eliminar").addEventListener("click", () => {
      if (!confirm("Borrar este cliente del dia?")) return;
      diaActual().clientes = diaActual().clientes.filter(item => item.id !== cliente.id);
      guardar();
      rerender();
    });
  }
}

function iniciarConfiguracion() {
  const el = {
    formProducto: $("#formProducto"), productoId: $("#productoId"), productoNombre: $("#productoNombre"), productoPrecio: $("#productoPrecio"), tablaProductos: $("#tablaProductos"),
    formCliente: $("#formClienteConfig"), clienteId: $("#clienteConfigId"), clienteNombre: $("#clienteConfigNombre"), clienteKg: $("#clienteConfigKg"), clienteOrden: $("#clienteConfigOrden"), tablaClientes: $("#tablaClientesConfig")
  };
  el.formProducto.addEventListener("submit", guardarProducto);
  el.formCliente.addEventListener("submit", guardarClienteConfig);
  renderConfig();

  function guardarProducto(event) {
    event.preventDefault();
    const id = el.productoId.value || slug(el.productoNombre.value) || crypto.randomUUID();
    const producto = { id, nombre: el.productoNombre.value.trim(), precio: numero(el.productoPrecio.value), fijo: Boolean(estado.config.products.find(item => item.id === id)?.fijo) };
    const index = estado.config.products.findIndex(item => item.id === id);
    if (index >= 0) estado.config.products[index] = producto; else estado.config.products.push(producto);
    el.formProducto.reset();
    guardar();
    renderConfig();
  }

  function guardarClienteConfig(event) {
    event.preventDefault();
    const id = el.clienteId.value || crypto.randomUUID();
    const cliente = { id, nombre: el.clienteNombre.value.trim(), kg: numero(el.clienteKg.value), orden: numero(el.clienteOrden.value) || estado.config.clients.length + 1 };
    const index = estado.config.clients.findIndex(item => item.id === id);
    if (index >= 0) estado.config.clients[index] = cliente; else estado.config.clients.push(cliente);
    el.formCliente.reset();
    guardar();
    renderConfig();
  }

  function renderConfig() {
    el.tablaProductos.innerHTML = "";
    estado.config.products.forEach(producto => {
      const fila = document.createElement("tr");
      fila.innerHTML = `<td>${esc(producto.nombre)}</td><td>${moneda(producto.precio)}</td><td class="acciones-tabla"><button type="button">Editar</button>${producto.fijo ? "" : '<button class="eliminar" type="button">Borrar</button>'}</td>`;
      fila.querySelector("button").addEventListener("click", () => { el.productoId.value = producto.id; el.productoNombre.value = producto.nombre; el.productoPrecio.value = producto.precio; });
      const borrar = fila.querySelector(".eliminar");
      if (borrar) borrar.addEventListener("click", () => { estado.config.products = estado.config.products.filter(item => item.id !== producto.id); guardar(); renderConfig(); });
      el.tablaProductos.append(fila);
    });

    el.tablaClientes.innerHTML = "";
    estado.config.clients.slice().sort((a, b) => a.orden - b.orden).forEach(cliente => {
      const fila = document.createElement("tr");
      fila.innerHTML = `<td>${esc(cliente.nombre)}</td><td>${cliente.kg}</td><td>${cliente.orden}</td><td class="acciones-tabla"><button type="button">Editar</button><button class="eliminar" type="button">Borrar</button></td>`;
      fila.querySelector("button").addEventListener("click", () => { el.clienteId.value = cliente.id; el.clienteNombre.value = cliente.nombre; el.clienteKg.value = cliente.kg; el.clienteOrden.value = cliente.orden; });
      fila.querySelector(".eliminar").addEventListener("click", () => { estado.config.clients = estado.config.clients.filter(item => item.id !== cliente.id); guardar(); renderConfig(); });
      el.tablaClientes.append(fila);
    });
  }
}

function iniciarReportes() {
  const el = {
    bloqueClave: $("#bloqueClave"), panel: $("#panelReportes"), formClave: $("#formClave"), clave: $("#claveReportes"), error: $("#errorClave"), salir: $("#salirReportes"),
    repDias: $("#repDias"), repVendido: $("#repVendido"), repEfectivo: $("#repEfectivo"), repMp: $("#repMp"), repGastos: $("#repGastos"), repDeuda: $("#repDeuda"), tabla: $("#tablaReportes")
  };
  el.formClave.addEventListener("submit", event => {
    event.preventDefault();
    if (el.clave.value !== REPORT_PASSWORD) { el.error.hidden = false; return; }
    sessionStorage.setItem("reportes-ok", "1");
    mostrarReportes();
  });
  el.salir.addEventListener("click", () => { sessionStorage.removeItem("reportes-ok"); el.panel.hidden = true; el.bloqueClave.hidden = false; });
  if (sessionStorage.getItem("reportes-ok") === "1") mostrarReportes();

  function mostrarReportes() {
    el.bloqueClave.hidden = true;
    el.panel.hidden = false;
    el.error.hidden = true;
    const filas = Object.entries(estado.dias).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, dia]) => ({ fecha, ...calcularDia(dia) }));
    const total = filas.reduce((acc, item) => {
      acc.totalVendido += item.totalVendido; acc.efectivoTeorico += item.efectivoTeorico; acc.mp += item.mp; acc.gastos += item.gastos; acc.deuda = item.deuda;
      return acc;
    }, { totalVendido: 0, efectivoTeorico: 0, mp: 0, gastos: 0, deuda: 0 });
    el.repDias.textContent = filas.length;
    el.repVendido.textContent = moneda(total.totalVendido);
    el.repEfectivo.textContent = moneda(total.efectivoTeorico);
    el.repMp.textContent = moneda(total.mp);
    el.repGastos.textContent = moneda(total.gastos);
    el.repDeuda.textContent = moneda(total.deuda);
    el.tabla.innerHTML = filas.length ? "" : '<tr><td class="vacio" colspan="8">Todavia no hay dias cargados.</td></tr>';
    filas.forEach(item => {
      const fila = document.createElement("tr");
      fila.innerHTML = `<td>${formatearFecha(item.fecha)}</td><td>${moneda(item.totalVendido)}</td><td>${moneda(item.efectivoTeorico)}</td><td>${moneda(estado.dias[item.fecha].efectivoReal)}</td><td>${moneda(item.mp)}</td><td>${moneda(item.gastos)}</td><td class="${item.diferencia < 0 ? "negativo" : "positivo"}">${moneda(item.diferencia)}</td><td>${moneda(item.deuda)}</td>`;
      el.tabla.append(fila);
    });
  }
}

function calcularDia(dia) {
  const totales = dia.clientes.reduce((acc, cliente) => {
    const calc = calcularCliente(cliente);
    acc.totalVendido += calc.ventaDia;
    acc.efectivoTeorico += numero(cliente.efectivo);
    acc.mp += numero(cliente.mp);
    acc.deuda += Math.max(calc.cuenta, 0);
    return acc;
  }, { totalVendido: 0, efectivoTeorico: 0, mp: 0, deuda: 0 });
  totales.gastos = dia.gastos.reduce((sum, gasto) => sum + numero(gasto.monto), 0);
  totales.esperado = totales.efectivoTeorico - totales.gastos;
  totales.diferencia = numero(dia.efectivoReal) + totales.gastos - totales.efectivoTeorico;
  return totales;
}

function calcularCliente(cliente) {
  const pan = numero(cliente.kg) * precio("pan");
  const facturas = numero(cliente.facturas) * precio("factura");
  const ventaDia = pan + facturas + numero(cliente.otros) + numero(cliente.prepizzas) + numero(cliente.panRallado) + numero(cliente.panMiga);
  const debe = ventaDia + numero(cliente.enContra);
  const cuenta = debe - numero(cliente.efectivo) - numero(cliente.mp);
  return { pan, facturas, ventaDia, debe, cuenta };
}

function inputCard(label, campo, valor, step = "1") {
  return `<label>${label}<input data-campo="${campo}" type="number" min="0" step="${step}" value="${valor}"></label>`;
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
      location.reload();
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
function formatearFecha(fecha) { const [year, month, day] = fecha.split("-"); return `${day}/${month}/${year}`; }
function numero(valor) { const n = Number(valor); return Number.isFinite(n) ? n : 0; }
function moneda(valor) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(numero(valor)); }
function esc(valor) { return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function attr(valor) { return esc(valor); }
function slug(valor) { return String(valor || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
