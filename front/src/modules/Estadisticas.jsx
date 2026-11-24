import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "../api/api";

const RUTAS_PAGOS_EMPLEADOS = ["/empleados_pagos", "/empleados-pagos"];

async function consultarPagosEmpleadosConFallback() {
  for (const ruta of RUTAS_PAGOS_EMPLEADOS) {
    try {
      const res = await api.get(ruta);
      return Array.isArray(res?.data) ? res.data : [];
    } catch (err) {
      if (err?.response?.status !== 404) throw err;
    }
  }
  return [];
}

function normalizarFechaISO(valor) {
  if (!valor) return "";
  const str = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mesActualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatearMesCorto(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "-";
  const [y, m] = ym.split("-");
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${meses[Number(m) - 1] || m} '${y.slice(2)}`;
}

function formatearMoneda(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function buscarChequeDePago(pago, listaCheques) {
  if (!pago || !Array.isArray(listaCheques) || listaCheques.length === 0) {
    return null;
  }
  if (pago.id != null) {
    const porPagoId = listaCheques.find(
      (ch) => ch.pago_id != null && Number(ch.pago_id) === Number(pago.id),
    );
    if (porPagoId) return porPagoId;
  }
  const esChequeTexto = String(pago.tipo_pago_nombre || pago.tipo_pago || "")
    .toLowerCase()
    .includes("cheque");
  if (!esChequeTexto) return null;

  const montoPago = Number(pago.monto || 0);
  return (
    listaCheques.find(
      (ch) =>
        Number(ch.cliente_id) === Number(pago.cliente_id) &&
        Math.abs(Number(ch.monto || 0) - montoPago) < 0.01,
    ) || null
  );
}

function clasificarTipoPago(pago, chequeAsociado) {
  const texto = String(
    pago.tipo_pago_nombre || pago.tipo_pago || "",
  ).toLowerCase();

  if (chequeAsociado || texto.includes("cheque")) return "cheque";
  if (texto.includes("transf")) return "transferencia";
  if (texto.includes("efect")) return "efectivo";

  const id = Number(pago.tipo_pago_id);
  if (id === 1) return "efectivo";
  if (id === 2) return "transferencia";
  if (id === 3) return "cheque";

  return "efectivo";
}

function normalizarEstadoCheque(estadoRaw) {
  const est = String(estadoRaw || "pendiente")
    .trim()
    .toLowerCase();
  if (est === "cobrado" || est === "cobrados") return "cobrado";
  if (est === "rechazado" || est === "rechazados") return "rechazado";
  if (
    est === "depositado" ||
    est === "depositados" ||
    est === "en deposito" ||
    est === "en depósito"
  ) {
    return "depositado";
  }
  return "pendiente";
}

function describirArcoTorta(cx, cy, r, anguloInicio, anguloFin) {
  const rad = (deg) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(anguloInicio));
  const y1 = cy + r * Math.sin(rad(anguloInicio));
  const x2 = cx + r * Math.cos(rad(anguloFin));
  const y2 = cy + r * Math.sin(rad(anguloFin));
  const arcoMayor = anguloFin - anguloInicio > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${arcoMayor} 1 ${x2} ${y2} Z`;
}

function calcularSegmentos(items, total, animProgress) {
  if (!items || total <= 0) return [];
  let acumulado = 0;
  const maxGrados = 360 * animProgress;
  const resultado = [];

  for (const item of items) {
    if (item.valor <= 0) continue;
    const gradosReales = (item.valor / total) * 360;
    const inicio = acumulado;
    const fin = Math.min(acumulado + gradosReales, maxGrados);

    if (fin > inicio) {
      resultado.push({
        ...item,
        inicio,
        fin: fin >= 359.9 ? 359.99 : fin,
      });
    }
    acumulado += gradosReales;
  }
  return resultado;
}

const styles = {
  container: {
    padding: "8px 6px",
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "16px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
  },
  chip: (activo) => ({
    padding: "8px 14px",
    borderRadius: "8px",
    border: activo ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
    backgroundColor: activo ? "#2563eb" : "#f8fafc",
    color: activo ? "#ffffff" : "#334155",
    fontWeight: "700",
    fontSize: "0.86rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  }),
  inputMes: {
    padding: "7px 11px",
    borderRadius: "8px",
    border: "1px solid #94a3b8",
    fontSize: "0.88rem",
    fontWeight: "600",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "13px",
    padding: "18px 20px",
    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
    boxSizing: "border-box",
  },
  cardTitle: {
    margin: "0 0 4px",
    fontSize: "1.05rem",
    fontWeight: "800",
    color: "#0f172a",
  },
  cardSub: {
    margin: "0 0 16px",
    fontSize: "0.82rem",
    color: "#64748b",
  },
};

export default function Estadistica() {
  const [trabajos, setTrabajos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [pagosEmpleados, setPagosEmpleados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [campos, setCampos] = useState([]);
  const [molinos, setMolinos] = useState([]);

  const [filtroModo, setFiltroModo] = useState("todo"); // "todo" | "mes"
  const [mesSeleccionado, setMesSeleccionado] = useState(() => mesActualISO());
  const [cargando, setCargando] = useState(true);
  const [animProgress, setAnimProgress] = useState(0);
  const filtroClaveRef = useRef(null);

  useEffect(() => {
    let cancelado = false;

    async function inicializar() {
      try {
        const [resTra, resPag, resCheq, listaPagEmp, resCli, resCam, resMol] =
          await Promise.all([
            api.get("/trabajos").catch(() => ({ data: [] })),
            api.get("/pagos").catch(() => ({ data: [] })),
            api.get("/cheques").catch(() => ({ data: [] })),
            consultarPagosEmpleadosConFallback(),
            api.get("/clientes").catch(() => ({ data: [] })),
            api.get("/campos").catch(() => ({ data: [] })),
            api.get("/molinos").catch(() => ({ data: [] })),
          ]);
        if (cancelado) return;

        setTrabajos(Array.isArray(resTra.data) ? resTra.data : []);
        setPagos(Array.isArray(resPag.data) ? resPag.data : []);
        setCheques(Array.isArray(resCheq.data) ? resCheq.data : []);
        setPagosEmpleados(listaPagEmp);
        setClientes(Array.isArray(resCli.data) ? resCli.data : []);
        setCampos(Array.isArray(resCam.data) ? resCam.data : []);
        setMolinos(Array.isArray(resMol.data) ? resMol.data : []);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    inicializar();

    return () => {
      cancelado = true;
    };
  }, []);

  // Animación fluida al entrar al módulo o cambiar el filtro
  useEffect(() => {
    if (cargando) return;
    const claveActual = `${filtroModo}__${mesSeleccionado}`;
    const reiniciarDesdeCero = filtroClaveRef.current !== claveActual;
    filtroClaveRef.current = claveActual;

    let rafId;
    const duracion = 750;
    const inicio = performance.now();

    const step = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimProgress(eased);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    if (reiniciarDesdeCero) {
      rafId = requestAnimationFrame((ahora) => {
        setAnimProgress(0);
        rafId = requestAnimationFrame(() => step(ahora));
      });
    } else {
      rafId = requestAnimationFrame(step);
    }

    return () => cancelAnimationFrame(rafId);
  }, [cargando, filtroModo, mesSeleccionado]);

  const cumpleFiltro = useCallback(
    (fechaRaw) => {
      if (filtroModo === "todo") return true;
      const iso = normalizarFechaISO(fechaRaw);
      return Boolean(iso && mesSeleccionado && iso.startsWith(mesSeleccionado));
    },
    [filtroModo, mesSeleccionado],
  );

  // 1. Proporción de los 3 tipos de pago (en cheques, solo cheques cobrados)
  const statsTiposPago = useMemo(() => {
    let efectivo = 0;
    let transferencia = 0;
    let chequeCobrado = 0;

    for (const p of pagos) {
      const ch = buscarChequeDePago(p, cheques);
      const monto = Number(p.monto || 0);
      if (monto <= 0) continue;

      const cat = clasificarTipoPago(p, ch);
      if (cat === "cheque") {
        const estadoCh = ch
          ? normalizarEstadoCheque(ch.estado)
          : normalizarEstadoCheque(p.estado_cheque || p.estado);
        const fechaRef =
          estadoCh === "cobrado"
            ? ch?.fecha_resolucion || ch?.fecha_cobro || p.fecha
            : p.fecha;
        if (!cumpleFiltro(fechaRef)) continue;
        if (estadoCh === "cobrado") {
          chequeCobrado += monto;
        }
        continue;
      }

      if (!cumpleFiltro(p.fecha)) continue;
      if (cat === "efectivo") efectivo += monto;
      else if (cat === "transferencia") transferencia += monto;
    }

    const total = efectivo + transferencia + chequeCobrado;
    const items = [
      {
        key: "efectivo",
        label: "Efectivo",
        valor: efectivo,
        color: "#16a34a",
        bgSuave: "#dcfce7",
      },
      {
        key: "transferencia",
        label: "Transferencia",
        valor: transferencia,
        color: "#2563eb",
        bgSuave: "#dbeafe",
      },
      {
        key: "cheque",
        label: "Cheque (cobrado)",
        valor: chequeCobrado,
        color: "#f59e0b",
        bgSuave: "#fef3c7",
      },
    ].map((item) => ({
      ...item,
      porcentaje: total > 0 ? (item.valor / total) * 100 : 0,
    }));

    return { items, total };
  }, [pagos, cheques, cumpleFiltro]);

  // 2. Torta de estados de cheques: pendiente, cobrado, rechazado, depositado
  const statsEstadosCheques = useMemo(() => {
    const acum = {
      pendiente: { valor: 0, cantidad: 0 },
      cobrado: { valor: 0, cantidad: 0 },
      rechazado: { valor: 0, cantidad: 0 },
      depositado: { valor: 0, cantidad: 0 },
    };

    if (Array.isArray(cheques) && cheques.length > 0) {
      for (const ch of cheques) {
        const estado = normalizarEstadoCheque(ch.estado);
        const fechaRef =
          estado === "cobrado" || estado === "rechazado"
            ? ch.fecha_resolucion || ch.fecha_vencimiento || ch.fecha
            : ch.fecha_vencimiento || ch.fecha;
        if (!cumpleFiltro(fechaRef)) continue;

        const monto = Number(ch.monto || 0);
        acum[estado].valor += Math.max(0, monto);
        acum[estado].cantidad += 1;
      }
    } else {
      for (const p of pagos) {
        const ch = buscarChequeDePago(p, cheques);
        const cat = clasificarTipoPago(p, ch);
        if (cat !== "cheque") continue;
        if (!cumpleFiltro(p.fecha)) continue;

        const estado = normalizarEstadoCheque(p.estado_cheque || p.estado);
        const monto = Number(p.monto || 0);
        acum[estado].valor += Math.max(0, monto);
        acum[estado].cantidad += 1;
      }
    }

    const totalMonto =
      acum.pendiente.valor +
      acum.cobrado.valor +
      acum.rechazado.valor +
      acum.depositado.valor;

    const totalCantidad =
      acum.pendiente.cantidad +
      acum.cobrado.cantidad +
      acum.rechazado.cantidad +
      acum.depositado.cantidad;

    const items = [
      {
        key: "pendiente",
        label: "Pendiente",
        valor: acum.pendiente.valor,
        cantidad: acum.pendiente.cantidad,
        color: "#eab308",
        bgSuave: "#fef9c3",
      },
      {
        key: "cobrado",
        label: "Cobrado",
        valor: acum.cobrado.valor,
        cantidad: acum.cobrado.cantidad,
        color: "#16a34a",
        bgSuave: "#dcfce7",
      },
      {
        key: "rechazado",
        label: "Rechazado",
        valor: acum.rechazado.valor,
        cantidad: acum.rechazado.cantidad,
        color: "#dc2626",
        bgSuave: "#fee2e2",
      },
      {
        key: "depositado",
        label: "Depositado",
        valor: acum.depositado.valor,
        cantidad: acum.depositado.cantidad,
        color: "#2563eb",
        bgSuave: "#dbeafe",
      },
    ].map((item) => ({
      ...item,
      porcentaje: totalMonto > 0 ? (item.valor / totalMonto) * 100 : 0,
    }));

    return { items, totalMonto, totalCantidad };
  }, [cheques, pagos, cumpleFiltro]);

  // 3. Facturación y Cobros (cobrado firme + extensión cheque pendiente)
  const statsBalance = useMemo(() => {
    const totalFacturado = trabajos
      .filter((t) => cumpleFiltro(t.fecha))
      .reduce((acc, t) => acc + Number(t.monto || 0), 0);

    let cobradoFirme = 0;
    let chequePendiente = 0;

    for (const p of pagos) {
      const monto = Number(p.monto || 0);
      if (monto <= 0) continue;

      const ch = buscarChequeDePago(p, cheques);
      const cat = clasificarTipoPago(p, ch);

      if (cat === "cheque") {
        const estadoCh = ch
          ? normalizarEstadoCheque(ch.estado)
          : normalizarEstadoCheque(p.estado_cheque || p.estado);
        const fechaRef =
          estadoCh === "cobrado" || estadoCh === "rechazado"
            ? ch?.fecha_resolucion || ch?.fecha_cobro || p.fecha
            : ch?.fecha_vencimiento || p.fecha;

        if (!cumpleFiltro(fechaRef)) continue;

        if (estadoCh === "cobrado") {
          cobradoFirme += monto;
        } else if (estadoCh === "pendiente") {
          chequePendiente += monto;
        }
      } else {
        if (!cumpleFiltro(p.fecha)) continue;
        cobradoFirme += monto;
      }
    }

    const totalCobradoConPendiente = cobradoFirme + chequePendiente;
    const diferencia = totalFacturado - totalCobradoConPendiente;

    return {
      totalFacturado,
      cobradoFirme,
      chequePendiente,
      totalCobradoConPendiente,
      diferencia,
    };
  }, [trabajos, pagos, cheques, cumpleFiltro]);

  // 4. Evolución mensual (últimos 6 meses): Facturado vs Sueldos a empleados
  const evolucionMensual = useMemo(() => {
    const ahora = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      meses.push({
        ym,
        etiqueta: formatearMesCorto(ym),
        facturado: 0,
        sueldos: 0,
      });
    }

    const mapa = new Map(meses.map((m) => [m.ym, m]));

    for (const t of trabajos) {
      const ym = normalizarFechaISO(t.fecha).slice(0, 7);
      if (mapa.has(ym)) {
        mapa.get(ym).facturado += Number(t.monto || 0);
      }
    }

    for (const pe of pagosEmpleados) {
      const ym = normalizarFechaISO(pe.fecha).slice(0, 7);
      if (mapa.has(ym)) {
        mapa.get(ym).sueldos += Number(pe.monto || 0);
      }
    }

    return meses;
  }, [trabajos, pagosEmpleados]);

  // 5. Distribución por Campo / Molino (Top 5 campos con cliente entre paréntesis)
  const topCampos = useMemo(() => {
    const mapa = new Map();

    for (const t of trabajos) {
      if (!cumpleFiltro(t.fecha)) continue;
      const cid = Number(t.campo_id || 0);
      const campoObj = campos.find((c) => Number(c.id) === cid);
      const nombreCampo =
        t.campo_nombre || campoObj?.nombre || "Sin campo asignado";

      const clienteIdNum = Number(t.cliente_id || campoObj?.cliente_id || 0);
      const clienteObj = clientes.find((cl) => Number(cl.id) === clienteIdNum);
      const nombreCliente =
        t.cliente_nombre ||
        campoObj?.cliente_nombre ||
        clienteObj?.nombre ||
        "Sin cliente";

      const clave = cid || `${nombreCampo}__${nombreCliente}`;

      const actual = mapa.get(clave) || {
        key: clave,
        nombre: nombreCampo,
        clienteNombre: nombreCliente,
        monto: 0,
        trabajosCount: 0,
        molinosSet: new Set(),
      };
      actual.monto += Number(t.monto || 0);
      actual.trabajosCount += 1;

      const molObj = molinos.find((m) => Number(m.id) === Number(t.molino_id));
      const molNombre = t.molino_nombre || molObj?.nombre;
      if (molNombre) actual.molinosSet.add(molNombre);

      mapa.set(clave, actual);
    }

    return Array.from(mapa.values())
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        molinosCount: c.molinosSet.size,
      }));
  }, [trabajos, campos, clientes, molinos, cumpleFiltro]);

  const segmentosTiposPago = useMemo(
    () =>
      calcularSegmentos(
        statsTiposPago.items,
        statsTiposPago.total,
        animProgress,
      ),
    [statsTiposPago, animProgress],
  );

  const segmentosEstadosCheques = useMemo(
    () =>
      calcularSegmentos(
        statsEstadosCheques.items,
        statsEstadosCheques.totalMonto,
        animProgress,
      ),
    [statsEstadosCheques, animProgress],
  );

  const maxBarBalance = Math.max(
    statsBalance.totalFacturado,
    statsBalance.totalCobradoConPendiente,
    1,
  );

  const maxEvolucion = Math.max(
    ...evolucionMensual.map((m) => Math.max(m.facturado, m.sueldos)),
    1,
  );

  const maxCampoMonto =
    topCampos.length > 0 ? Math.max(topCampos[0].monto, 1) : 1;

  const hCobradoFirmePct =
    statsBalance.cobradoFirme > 0
      ? Math.max(
          3,
          (statsBalance.cobradoFirme / maxBarBalance) * 100 * animProgress,
        )
      : 0;
  const hChequePendientePct =
    statsBalance.chequePendiente > 0
      ? Math.max(
          3,
          (statsBalance.chequePendiente / maxBarBalance) * 100 * animProgress,
        )
      : 0;

  return (
    <div style={styles.container}>
      {/* Barra superior de filtros */}
      <div style={styles.toolbar}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.15rem",
              fontWeight: "900",
              color: "#0f172a",
            }}
          >
            Panel de Estadísticas
          </h2>
          <p
            style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}
          >
            {filtroModo === "todo"
              ? "Mostrando el acumulado histórico completo"
              : `Mostrando datos correspondientes a ${formatearMesCorto(mesSeleccionado)}`}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setFiltroModo("todo")}
            style={styles.chip(filtroModo === "todo")}
          >
            Todo
          </button>
          <button
            type="button"
            onClick={() => setFiltroModo("mes")}
            style={styles.chip(filtroModo === "mes")}
          >
            Por mes
          </button>

          {filtroModo === "mes" && (
            <input
              type="month"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              style={styles.inputMes}
            />
          )}
        </div>
      </div>

      {/* FILA 1: Torta de Tipos de Pago + Torta de Estados de Cheques */}
      <div style={styles.grid2}>
        {/* GRÁFICO 1: Torta de los 3 tipos de pago (cheques solo cobrados) */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Proporción por Tipo de Pago</h3>
          <p style={styles.cardSub}>
            Efectivo, Transferencia y Cheques cobrados sobre el total
          </p>

          {statsTiposPago.total <= 0 ? (
            <div
              style={{
                padding: "36px 16px",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                color: "#64748b",
                fontSize: "0.88rem",
              }}
            >
              No hay pagos efectivos / transferencias / cheques cobrados en este
              período.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                gap: "18px",
                flexWrap: "wrap",
              }}
            >
              <svg width="190" height="190" viewBox="0 0 190 190">
                <circle cx="95" cy="95" r="82" fill="#f1f5f9" />
                {segmentosTiposPago.map((seg) => (
                  <path
                    key={seg.key}
                    d={describirArcoTorta(95, 95, 82, seg.inicio, seg.fin)}
                    fill={seg.color}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                ))}
                <circle cx="95" cy="95" r="44" fill="#ffffff" />
                <text
                  x="95"
                  y="90"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#64748b"
                >
                  TOTAL
                </text>
                <text
                  x="95"
                  y="107"
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight="900"
                  fill="#0f172a"
                >
                  {formatearMoneda(statsTiposPago.total * animProgress)}
                </text>
              </svg>

              <div
                style={{
                  flex: "1 1 200px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {statsTiposPago.items.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "9px 12px",
                      borderRadius: "9px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "4px",
                          backgroundColor: item.color,
                          display: "inline-block",
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: "800",
                            fontSize: "0.86rem",
                            color: "#0f172a",
                          }}
                        >
                          {item.label}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#475569" }}>
                          {formatearMoneda(item.valor)}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "999px",
                        backgroundColor: item.bgSuave,
                        color: "#0f172a",
                        fontWeight: "900",
                        fontSize: "0.8rem",
                      }}
                    >
                      {(item.porcentaje * animProgress).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GRÁFICO 2: Torta de Estados de Cheques */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Estados de Cheques</h3>
          <p style={styles.cardSub}>
            Pendiente, Cobrado, Rechazado y Depositado (
            {statsEstadosCheques.totalCantidad}{" "}
            {statsEstadosCheques.totalCantidad === 1 ? "cheque" : "cheques"})
          </p>

          {statsEstadosCheques.totalMonto <= 0 ? (
            <div
              style={{
                padding: "36px 16px",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                color: "#64748b",
                fontSize: "0.88rem",
              }}
            >
              No hay cheques registrados en este período.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                gap: "18px",
                flexWrap: "wrap",
              }}
            >
              <svg width="190" height="190" viewBox="0 0 190 190">
                <circle cx="95" cy="95" r="82" fill="#f1f5f9" />
                {segmentosEstadosCheques.map((seg) => (
                  <path
                    key={seg.key}
                    d={describirArcoTorta(95, 95, 82, seg.inicio, seg.fin)}
                    fill={seg.color}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                ))}
                <circle cx="95" cy="95" r="44" fill="#ffffff" />
                <text
                  x="95"
                  y="90"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#64748b"
                >
                  CHEQUES
                </text>
                <text
                  x="95"
                  y="107"
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight="900"
                  fill="#0f172a"
                >
                  {formatearMoneda(
                    statsEstadosCheques.totalMonto * animProgress,
                  )}
                </text>
              </svg>

              <div
                style={{
                  flex: "1 1 200px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {statsEstadosCheques.items.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "7px 11px",
                      borderRadius: "9px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          width: "11px",
                          height: "11px",
                          borderRadius: "4px",
                          backgroundColor: item.color,
                          display: "inline-block",
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: "800",
                            fontSize: "0.84rem",
                            color: "#0f172a",
                          }}
                        >
                          {item.label}{" "}
                          <span style={{ fontWeight: "600", color: "#64748b" }}>
                            ({item.cantidad})
                          </span>
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "#475569" }}>
                          {formatearMoneda(item.valor)}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "999px",
                        backgroundColor: item.bgSuave,
                        color: "#0f172a",
                        fontWeight: "900",
                        fontSize: "0.78rem",
                      }}
                    >
                      {(item.porcentaje * animProgress).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILA 2: Facturación y Cobros + Actividad por Campo y Molinos */}
      <div style={styles.grid2}>
        {/* GRÁFICO 3: Facturación y Cobros (escalonado con cheque pendiente) */}
        <div style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <div>
              <h3 style={styles.cardTitle}>Facturación y Cobros</h3>
              <p style={{ ...styles.cardSub, marginBottom: 0 }}>
                Cobros firmes + extensión de cheques pendientes
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                fontSize: "0.74rem",
                fontWeight: "700",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  color: "#15803d",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    backgroundColor: "#16a34a",
                  }}
                />
                Cobrado firme
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  color: "#b45309",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    backgroundColor: "#f59e0b",
                  }}
                />
                Ch. pendiente
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "24px",
              alignItems: "end",
              height: "180px",
              padding: "14px 20px 8px",
              backgroundColor: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* Barra 1: Facturado */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "800",
                  color: "#1d4ed8",
                  marginBottom: "6px",
                  textAlign: "center",
                }}
              >
                {formatearMoneda(statsBalance.totalFacturado * animProgress)}
              </div>
              <div
                style={{
                  width: "46%",
                  maxWidth: "74px",
                  height: `${Math.max(
                    statsBalance.totalFacturado > 0 ? 4 : 0,
                    (statsBalance.totalFacturado / maxBarBalance) *
                      100 *
                      animProgress,
                  )}%`,
                  background:
                    "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
                  borderRadius: "8px 8px 3px 3px",
                  boxShadow: "0 4px 10px rgba(15, 23, 42, 0.14)",
                }}
              />
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "0.82rem",
                  fontWeight: "800",
                  color: "#334155",
                }}
              >
                Facturado
              </div>
            </div>

            {/* Barra 2: Cobros escalonada (Cobrado firme base + Cheque pendiente extensión) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "800",
                  color: "#15803d",
                  marginBottom: "6px",
                  textAlign: "center",
                }}
              >
                {formatearMoneda(
                  statsBalance.totalCobradoConPendiente * animProgress,
                )}
              </div>

              <div
                style={{
                  width: "46%",
                  maxWidth: "74px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  height: "100%",
                }}
              >
                {statsBalance.chequePendiente > 0 && (
                  <div
                    title={`Cheque pendiente: ${formatearMoneda(statsBalance.chequePendiente)}`}
                    style={{
                      width: "100%",
                      height: `${hChequePendientePct}%`,
                      background:
                        "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
                      borderRadius:
                        statsBalance.cobradoFirme > 0
                          ? "8px 8px 0 0"
                          : "8px 8px 3px 3px",
                      borderBottom:
                        statsBalance.cobradoFirme > 0
                          ? "2px dashed #ffffff"
                          : "none",
                      boxSizing: "border-box",
                    }}
                  />
                )}

                {statsBalance.cobradoFirme > 0 && (
                  <div
                    title={`Cobrado firme: ${formatearMoneda(statsBalance.cobradoFirme)}`}
                    style={{
                      width: "100%",
                      height: `${hCobradoFirmePct}%`,
                      background:
                        "linear-gradient(180deg, #22c55e 0%, #15803d 100%)",
                      borderRadius:
                        statsBalance.chequePendiente > 0
                          ? "0 0 3px 3px"
                          : "8px 8px 3px 3px",
                      boxShadow: "0 4px 10px rgba(15, 23, 42, 0.14)",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  marginTop: "8px",
                  fontSize: "0.82rem",
                  fontWeight: "800",
                  color: "#334155",
                }}
              >
                Cobros
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "12px",
              padding: "9px 12px",
              borderRadius: "8px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              fontSize: "0.8rem",
              fontWeight: "700",
              color: "#334155",
            }}
          >
            <span>
              Cobrado firme:{" "}
              <strong style={{ color: "#15803d" }}>
                {formatearMoneda(statsBalance.cobradoFirme)}
              </strong>{" "}
              · Ch. pendiente:{" "}
              <strong style={{ color: "#b45309" }}>
                {formatearMoneda(statsBalance.chequePendiente)}
              </strong>
            </span>
            <span
              style={{
                color: statsBalance.diferencia > 0 ? "#dc2626" : "#15803d",
                fontWeight: "900",
              }}
            >
              Saldo: {formatearMoneda(statsBalance.diferencia)}
            </span>
          </div>
        </div>

        {/* GRÁFICO 4: Distribución por Campo / Molino */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Actividad por Campo y Molinos</h3>
          <p style={styles.cardSub}>
            Top 5 campos con mayor facturación y cantidad de trabajos
          </p>

          {topCampos.length === 0 ? (
            <div
              style={{
                padding: "30px 16px",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                color: "#64748b",
                fontSize: "0.88rem",
              }}
            >
              No hay trabajos registrados en este período.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {topCampos.map((cmp) => {
                const anchoPct = Math.max(
                  6,
                  (cmp.monto / maxCampoMonto) * 100 * animProgress,
                );
                return (
                  <div key={cmp.key}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "4px",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: "800",
                            fontSize: "0.88rem",
                            color: "#0f172a",
                          }}
                        >
                          {cmp.nombre}{" "}
                          <span style={{ fontWeight: "600", color: "#475569" }}>
                            ({cmp.clienteNombre})
                          </span>
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#64748b",
                            marginLeft: "6px",
                          }}
                        >
                          · {cmp.trabajosCount} trab.
                          {cmp.molinosCount > 0
                            ? ` · ${cmp.molinosCount} mol.`
                            : ""}
                        </span>
                      </div>

                      <span
                        style={{
                          fontWeight: "800",
                          fontSize: "0.86rem",
                          color: "#0f766e",
                        }}
                      >
                        {formatearMoneda(cmp.monto * animProgress)}
                      </span>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "11px",
                        backgroundColor: "#f1f5f9",
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${anchoPct}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg, #14b8a6 0%, #0f766e 100%)",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FILA 3: Evolución Mensual (Facturado vs Sueldos a empleados) */}
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div>
            <h3 style={styles.cardTitle}>
              Evolución Mensual (Últimos 6 Meses)
            </h3>
            <p style={{ ...styles.cardSub, marginBottom: 0 }}>
              Comparación mes a mes entre lo facturado y lo pagado en sueldos a
              empleados
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              fontSize: "0.8rem",
              fontWeight: "700",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#1d4ed8",
              }}
            >
              <span
                style={{
                  width: "11px",
                  height: "11px",
                  borderRadius: "3px",
                  backgroundColor: "#2563eb",
                }}
              />
              Facturado
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#c2410c",
              }}
            >
              <span
                style={{
                  width: "11px",
                  height: "11px",
                  borderRadius: "3px",
                  backgroundColor: "#f97316",
                }}
              />
              Sueldos Emp.
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: "10px",
            alignItems: "end",
            height: "190px",
            padding: "16px 10px 8px",
            backgroundColor: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          {evolucionMensual.map((m) => {
            const hFact = Math.max(
              3,
              (m.facturado / maxEvolucion) * 100 * animProgress,
            );
            const hSuel = Math.max(
              3,
              (m.sueldos / maxEvolucion) * 100 * animProgress,
            );

            return (
              <div
                key={m.ym}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "5px",
                    height: "130px",
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  <div
                    title={`Facturado: ${formatearMoneda(m.facturado)}`}
                    style={{
                      width: "26%",
                      maxWidth: "24px",
                      height: `${hFact}%`,
                      background:
                        "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
                      borderRadius: "5px 5px 2px 2px",
                    }}
                  />
                  <div
                    title={`Sueldos Emp.: ${formatearMoneda(m.sueldos)}`}
                    style={{
                      width: "26%",
                      maxWidth: "24px",
                      height: `${hSuel}%`,
                      background:
                        "linear-gradient(180deg, #fb923c 0%, #ea580c 100%)",
                      borderRadius: "5px 5px 2px 2px",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "0.78rem",
                    fontWeight: "800",
                    color: "#334155",
                  }}
                >
                  {m.etiqueta}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
