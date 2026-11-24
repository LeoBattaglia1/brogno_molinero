import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";

const TIPOS_PAGO_RESPALDO = [
  { id: 1, nombre: "Efectivo" },
  { id: 2, nombre: "Transferencia" },
  { id: 3, nombre: "Cheque" },
];

const ESTADOS_CHEQUE = [
  {
    key: "pendiente",
    label: "Pendiente",
    bg: "#fef3c7",
    color: "#92400e",
    border: "#fcd34d",
  },
  {
    key: "depositado",
    label: "Depositado",
    bg: "#dbeafe",
    color: "#1e40af",
    border: "#93c5fd",
  },
  {
    key: "cobrado",
    label: "Cobrado",
    bg: "#dcfce7",
    color: "#166534",
    border: "#86efac",
  },
  {
    key: "rechazado",
    label: "Rechazado",
    bg: "#fee2e2",
    color: "#991b1b",
    border: "#fca5a5",
  },
];

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseFechaLocal(isoStr) {
  if (!isoStr) return null;
  const limpia = String(isoStr).slice(0, 10);
  const [y, m, d] = limpia.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatearFechaCorta(isoStr) {
  const dt = parseFechaLocal(isoStr);
  if (!dt) return "—";
  const d = String(dt.getDate()).padStart(2, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatearMoneda(valor) {
  const num = Math.round(Number(valor || 0));
  return num.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function normalizarTiposPago(rawData) {
  const arr = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(rawData?.tipos_pago)
        ? rawData.tipos_pago
        : [];

  if (arr.length === 0) return TIPOS_PAGO_RESPALDO;

  return arr.map((item, idx) => ({
    id: item.id ?? item.tipo_pago_id ?? idx + 1,
    nombre: String(item.nombre ?? item.tipo ?? item.descripcion ?? "").trim(),
  }));
}

function buscarIdEfectivo(listaTipos) {
  const encontrado = listaTipos.find((tp) =>
    String(tp.nombre || "")
      .toLowerCase()
      .includes("efectivo"),
  );
  if (encontrado) return String(encontrado.id);
  return listaTipos[0] ? String(listaTipos[0].id) : "1";
}

function crearPagoVacio(tipoPagoPorDefecto = "1", fechaPorDefecto = hoyISO()) {
  return {
    uid: `${Date.now()}-${Math.random()}`,
    tipo_pago_id: String(tipoPagoPorDefecto),
    monto: "",
    observacion: "",
    cheque: {
      numero_cheque: "",
      banco: "",
      fecha_cobro: fechaPorDefecto,
    },
  };
}

function esPagoConChequeRechazado(pago, listaCheques, listaTiposPago = []) {
  if (!pago || !Array.isArray(listaCheques) || listaCheques.length === 0) {
    return false;
  }

  if (pago.id != null) {
    const porPagoId = listaCheques.find(
      (ch) => ch.pago_id != null && Number(ch.pago_id) === Number(pago.id),
    );
    if (porPagoId) {
      return (
        String(porPagoId.estado || "")
          .trim()
          .toLowerCase() === "rechazado"
      );
    }
  }

  const tipoObj = listaTiposPago.find(
    (tp) => String(tp.id) === String(pago.tipo_pago_id),
  );
  const textoTipo = String(
    pago.tipo_pago_nombre || pago.tipo_pago || tipoObj?.nombre || "",
  ).toLowerCase();

  const esCheque =
    textoTipo.includes("cheque") || Number(pago.tipo_pago_id) === 3;

  const montoPago = Number(pago.monto || 0);
  if (!esCheque && montoPago <= 0) {
    return false;
  }

  return listaCheques.some(
    (ch) =>
      Number(ch.cliente_id) === Number(pago.cliente_id) &&
      Math.abs(Number(ch.monto || 0) - montoPago) < 0.01 &&
      String(ch.estado || "")
        .trim()
        .toLowerCase() === "rechazado",
  );
}

function obtenerInfoDiasCheque(cheque) {
  const rawFecha = cheque.fecha_cobro || cheque.fecha_vencimiento;
  const fechaCobro = parseFechaLocal(rawFecha);
  if (!fechaCobro) {
    return {
      textoPrincipal: "Sin fecha de cobro",
      urgencia: "neutral",
    };
  }

  const hoy = parseFechaLocal(hoyISO());
  const msPorDia = 1000 * 60 * 60 * 24;
  const diasHastaCobro = Math.round((fechaCobro - hoy) / msPorDia);

  const fechaVencimiento = new Date(fechaCobro.getTime() + 30 * msPorDia);
  const diasHastaVencimiento = Math.round((fechaVencimiento - hoy) / msPorDia);

  const estado = String(cheque.estado || "pendiente").toLowerCase();
  if (estado === "cobrado") {
    return {
      textoPrincipal: "Acreditado / Cobrado",
      urgencia: "ok",
    };
  }
  if (estado === "rechazado") {
    return {
      textoPrincipal: "Cheque rechazado",
      urgencia: "danger",
    };
  }

  if (diasHastaCobro > 0) {
    return {
      textoPrincipal: `Faltan ${diasHastaCobro} ${diasHastaCobro === 1 ? "día" : "días"} para cobrar (vence en ${diasHastaVencimiento} días)`,
      urgencia: diasHastaCobro <= 3 ? "warn" : "neutral",
    };
  }

  if (diasHastaCobro === 0) {
    return {
      textoPrincipal: `¡Habilitado hoy para cobrar! (vence en ${diasHastaVencimiento} días)`,
      urgencia: "ok",
    };
  }

  if (diasHastaVencimiento > 0) {
    return {
      textoPrincipal: `Habilitado · Vence en ${diasHastaVencimiento} ${diasHastaVencimiento === 1 ? "día" : "días"} (${formatearFechaCorta(fechaVencimiento)})`,
      urgencia: diasHastaVencimiento <= 5 ? "warn" : "ok",
    };
  }

  return {
    textoPrincipal: `Plazo vencido (30 días · venció ${formatearFechaCorta(fechaVencimiento)})`,
    urgencia: "danger",
  };
}

function estiloEstado(estado) {
  const key = String(estado || "pendiente").toLowerCase();
  return ESTADOS_CHEQUE.find((e) => e.key === key) || ESTADOS_CHEQUE[0];
}

const styles = {
  container: {
    padding: "8px 6px",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  layoutGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "16px",
    maxWidth: "1200px",
    margin: "0 auto",
    alignItems: "start",
  },
  panel: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px 18px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)",
    boxSizing: "border-box",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
    paddingBottom: "10px",
    borderBottom: "1px solid #e2e8f0",
  },
  panelTitle: {
    margin: 0,
    fontSize: "1.02rem",
    fontWeight: "800",
    color: "#0f172a",
  },
  deudorItem: {
    width: "100%",
    textAlign: "left",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "9px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    cursor: "pointer",
    transition: "all 0.16s ease",
  },
  deudorResumenBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "9px",
    border: "1.5px solid #93c5fd",
    backgroundColor: "#eff6ff",
  },
  btnVolverChico: {
    padding: "4px 9px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.76rem",
    whiteSpace: "nowrap",
  },
  section: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "13px",
    backgroundColor: "#f8fafc",
    marginTop: "12px",
  },
  colHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "0.94rem",
    fontWeight: "800",
    color: "#0f172a",
  },
  label: {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "4px",
  },
  input: {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.9rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
    width: "100%",
  },
  select: {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.9rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
    width: "100%",
  },
  btnMiniColor: (bg) => ({
    padding: "6px 10px",
    backgroundColor: bg,
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.78rem",
    whiteSpace: "nowrap",
  }),
  btnQuitarPago: {
    padding: "5px 9px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.78rem",
  },
  btnSuccess: {
    padding: "10px 18px",
    background: "linear-gradient(135deg, #2e6f40 0%, #1d4d2b 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.92rem",
    fontWeight: "700",
    boxShadow: "0 4px 12px rgba(46, 111, 64, 0.25)",
  },
  btnSecondary: {
    padding: "9px 15px",
    backgroundColor: "#64748b",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.86rem",
  },
  btnDepositar: (ocupado) => ({
    padding: "5px 11px",
    borderRadius: "7px",
    border: "none",
    backgroundColor: "#1d4ed8",
    color: "#ffffff",
    fontWeight: "800",
    fontSize: "0.75rem",
    cursor: ocupado ? "not-allowed" : "pointer",
    opacity: ocupado ? 0.65 : 1,
    whiteSpace: "nowrap",
  }),
  alertaError: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "600",
    marginBottom: "10px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    padding: "20px",
    backgroundColor: "rgba(10, 15, 28, 0.72)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2500,
    boxSizing: "border-box",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "22px 26px",
    borderRadius: "14px",
    maxWidth: "520px",
    width: "92vw",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.4)",
    position: "relative",
    boxSizing: "border-box",
  },
  btnCloseX: {
    position: "absolute",
    top: "14px",
    right: "16px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    width: "32px",
    height: "32px",
    fontSize: "1rem",
    fontWeight: "700",
    color: "#334155",
    cursor: "pointer",
  },
  ficheroContenedor: {
    background: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
    border: "2px solid #cbd5e1",
    borderRadius: "12px",
    padding: "14px",
    boxShadow: "inset 0 2px 6px rgba(15, 23, 42, 0.08)",
  },
  chequeFicha: (activa, levantada) => ({
    position: "relative",
    width: "100%",
    textAlign: "left",
    backgroundColor: "#fffdf7",
    border: activa ? "2px solid #0f172a" : "1px solid #cbd5e1",
    borderLeft: activa ? "6px solid #1d4ed8" : "6px solid #64748b",
    borderRadius: "10px",
    padding: "10px 13px",
    cursor: "pointer",
    transform: levantada
      ? "translateY(-6px) translateX(4px) scale(1.015)"
      : "translateY(0) translateX(0) scale(1)",
    boxShadow: levantada
      ? "0 14px 24px -6px rgba(15, 23, 42, 0.24)"
      : "0 3px 8px rgba(15, 23, 42, 0.08)",
    transition:
      "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease, border-color 0.15s ease",
  }),
  toastContainer: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxWidth: "420px",
    width: "calc(100vw - 40px)",
    pointerEvents: "none",
  },
  toastCard: (tipo) => ({
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px 16px",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    border: `1px solid ${tipo === "error" ? "#fecaca" : "#bbf7d0"}`,
    borderLeft: `6px solid ${tipo === "error" ? "#dc2626" : "#16a34a"}`,
    boxShadow: "0 14px 30px -6px rgba(15, 23, 42, 0.22)",
  }),
  toastBadge: (tipo) => ({
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontWeight: "800",
    fontSize: "0.95rem",
    backgroundColor: tipo === "error" ? "#fee2e2" : "#dcfce7",
    color: tipo === "error" ? "#dc2626" : "#15803d",
  }),
};

export default function PagosCheques({ onActualizado }) {
  const [clientes, setClientes] = useState([]);
  const [trabajos, setTrabajos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [tiposPago, setTiposPago] = useState(TIPOS_PAGO_RESPALDO);

  const hoyMin = useMemo(() => hoyISO(), []);

  const [clienteDeudorId, setClienteDeudorId] = useState("");
  const [fechaPago, setFechaPago] = useState(() => hoyISO());
  const [pagosLista, setPagosLista] = useState(() => [
    crearPagoVacio(buscarIdEfectivo(TIPOS_PAGO_RESPALDO), hoyISO()),
  ]);
  const [errorPago, setErrorPago] = useState("");
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [confirmacionPago, setConfirmacionPago] = useState(null);

  const [filtroEstadoCheque, setFiltroEstadoCheque] = useState("pendiente");
  const [chequeSeleccionadoId, setChequeSeleccionadoId] = useState(null);
  const [chequeHoverId, setChequeHoverId] = useState(null);
  const [depositandoChequeId, setDepositandoChequeId] = useState(null);

  const [toasts, setToasts] = useState([]);

  const mostrarAviso = useCallback((titulo, mensaje, tipo = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, titulo, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      const [resCli, resTra, resPag, resCheq, resTipos] = await Promise.all([
        api.get("/clientes").catch(() => null),
        api.get("/trabajos").catch(() => null),
        api.get("/pagos").catch(() => null),
        api.get("/cheques").catch(() => null),
        api.get("/tipos_pago").catch(() => null),
      ]);

      if (Array.isArray(resCli?.data)) setClientes(resCli.data);
      if (Array.isArray(resTra?.data)) setTrabajos(resTra.data);
      if (Array.isArray(resPag?.data)) setPagos(resPag.data);
      if (Array.isArray(resCheq?.data)) setCheques(resCheq.data);

      if (resTipos?.data) {
        const listaTipos = normalizarTiposPago(resTipos.data);
        setTiposPago(listaTipos);

        const idEfectivo = buscarIdEfectivo(listaTipos);
        setPagosLista((prev) =>
          prev.map((p, idx) => {
            const existe = listaTipos.some(
              (tp) => String(tp.id) === String(p.tipo_pago_id),
            );
            if (existe) return p;
            return {
              ...p,
              tipo_pago_id: idx === 0 ? idEfectivo : String(listaTipos[0].id),
            };
          }),
        );
      }
    } catch (err) {
      console.error("Error cargando PagosCheques:", err);
      mostrarAviso(
        "Error de conexión",
        "No se pudieron cargar los datos de pagos y cheques.",
        "error",
      );
    }
  }, [mostrarAviso]);

  useEffect(() => {
    let cancelado = false;

    async function inicializar() {
      try {
        const [resCli, resTra, resPag, resCheq, resTipos] = await Promise.all([
          api.get("/clientes").catch(() => null),
          api.get("/trabajos").catch(() => null),
          api.get("/pagos").catch(() => null),
          api.get("/cheques").catch(() => null),
          api.get("/tipos_pago").catch(() => null),
        ]);
        if (cancelado) return;

        if (Array.isArray(resCli?.data)) setClientes(resCli.data);
        if (Array.isArray(resTra?.data)) setTrabajos(resTra.data);
        if (Array.isArray(resPag?.data)) setPagos(resPag.data);
        if (Array.isArray(resCheq?.data)) setCheques(resCheq.data);

        if (resTipos?.data) {
          const listaTipos = normalizarTiposPago(resTipos.data);
          setTiposPago(listaTipos);

          const idEfectivo = buscarIdEfectivo(listaTipos);
          setPagosLista((prev) =>
            prev.map((p, idx) => {
              const existe = listaTipos.some(
                (tp) => String(tp.id) === String(p.tipo_pago_id),
              );
              if (existe) return p;
              return {
                ...p,
                tipo_pago_id: idx === 0 ? idEfectivo : String(listaTipos[0].id),
              };
            }),
          );
        }
      } catch (err) {
        if (cancelado) return;
        console.error("Error cargando PagosCheques:", err);
        mostrarAviso(
          "Error de conexión",
          "No se pudieron cargar los datos de pagos y cheques.",
          "error",
        );
      }
    }

    inicializar();

    return () => {
      cancelado = true;
    };
  }, [mostrarAviso]);

  const clientesConPendiente = useMemo(() => {
    if (clientes.length === 0) return [];

    const totalTrabajosPorCliente = new Map();
    for (const tr of trabajos) {
      const cid = Number(tr.cliente_id);
      const actual = totalTrabajosPorCliente.get(cid) || 0;
      totalTrabajosPorCliente.set(cid, actual + Number(tr.monto || 0));
    }

    const totalPagosPorCliente = new Map();
    const idsPagosConocidos = new Set(
      pagos.filter((p) => p.id != null).map((p) => Number(p.id)),
    );

    for (const pg of pagos) {
      if (esPagoConChequeRechazado(pg, cheques, tiposPago)) {
        continue;
      }
      const cid = Number(pg.cliente_id);
      const actual = totalPagosPorCliente.get(cid) || 0;
      totalPagosPorCliente.set(cid, actual + Number(pg.monto || 0));
    }

    const deudaExtraChequesHuerfanos = new Map();
    for (const ch of cheques) {
      if (
        String(ch.estado || "")
          .trim()
          .toLowerCase() !== "rechazado"
      ) {
        continue;
      }
      const tienePagoVinculado =
        ch.pago_id != null && idsPagosConocidos.has(Number(ch.pago_id));

      if (!tienePagoVinculado) {
        const cid = Number(ch.cliente_id);
        const actual = deudaExtraChequesHuerfanos.get(cid) || 0;
        deudaExtraChequesHuerfanos.set(cid, actual + Number(ch.monto || 0));
      }
    }

    return clientes
      .map((cli) => {
        const cid = Number(cli.id);
        const totalTra = Math.round(totalTrabajosPorCliente.get(cid) || 0);
        const totalPag = Math.round(totalPagosPorCliente.get(cid) || 0);
        const extraSinPago = Math.round(
          deudaExtraChequesHuerfanos.get(cid) || 0,
        );
        const pendiente = totalTra - totalPag + extraSinPago;

        return {
          ...cli,
          totalTrabajos: totalTra + extraSinPago,
          totalPagado: totalPag,
          saldoPendiente: pendiente,
        };
      })
      .filter((c) => c.saldoPendiente > 0)
      .sort((a, b) => b.saldoPendiente - a.saldoPendiente);
  }, [clientes, trabajos, pagos, cheques, tiposPago]);

  const clienteDeudorSeleccionado = useMemo(
    () =>
      clientesConPendiente.find(
        (c) => Number(c.id) === Number(clienteDeudorId),
      ) || null,
    [clientesConPendiente, clienteDeudorId],
  );

  const esTipoCheque = useCallback(
    (tipoId) => {
      const encontrado = tiposPago.find(
        (tp) => String(tp.id) === String(tipoId),
      );
      return String(encontrado?.nombre || "")
        .toLowerCase()
        .includes("cheque");
    },
    [tiposPago],
  );

  const sumaPagos = useMemo(
    () =>
      Math.round(pagosLista.reduce((acc, p) => acc + Number(p.monto || 0), 0)),
    [pagosLista],
  );

  const handleSeleccionarCliente = (cliId) => {
    setClienteDeudorId(String(cliId));
    setErrorPago("");
    setFechaPago(hoyISO());
    setPagosLista([crearPagoVacio(buscarIdEfectivo(tiposPago), hoyISO())]);
  };

  const handleVolverAListaClientes = () => {
    setClienteDeudorId("");
    setErrorPago("");
    setPagosLista([crearPagoVacio(buscarIdEfectivo(tiposPago), hoyISO())]);
  };

  const agregarLineaPago = () => {
    const idEfectivo = buscarIdEfectivo(tiposPago);
    setPagosLista((prev) => [...prev, crearPagoVacio(idEfectivo, hoyISO())]);
  };

  const quitarLineaPago = (uid) => {
    setPagosLista((prev) =>
      prev.length <= 1 ? prev : prev.filter((p) => p.uid !== uid),
    );
  };

  const actualizarPago = (uid, cambios) => {
    setPagosLista((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, ...cambios } : p)),
    );
  };

  const actualizarChequePago = (uid, cambiosCheque) => {
    const cambiosAjustados = { ...cambiosCheque };
    if (cambiosAjustados.fecha_cobro !== undefined) {
      const fechaHoy = hoyISO();
      const limpia = String(cambiosAjustados.fecha_cobro || "").slice(0, 10);
      if (limpia && limpia < fechaHoy) {
        cambiosAjustados.fecha_cobro = fechaHoy;
      }
    }
    setPagosLista((prev) =>
      prev.map((p) =>
        p.uid === uid
          ? { ...p, cheque: { ...p.cheque, ...cambiosAjustados } }
          : p,
      ),
    );
  };

  const validarPago = () => {
    const fechaHoy = hoyISO();
    if (!clienteDeudorSeleccionado) {
      return "Seleccioná un cliente de la lista con saldo pendiente.";
    }
    if (!fechaPago) {
      return "Indicá la fecha del pago.";
    }
    if (!Array.isArray(pagosLista) || pagosLista.length === 0) {
      return "Agregá al menos una forma de pago.";
    }

    for (let i = 0; i < pagosLista.length; i++) {
      const p = pagosLista[i];
      const tipoNum = Number(p.tipo_pago_id);
      if (!p.tipo_pago_id || Number.isNaN(tipoNum) || tipoNum <= 0) {
        return `Seleccioná un tipo de pago válido en el pago #${i + 1}.`;
      }
      const montoLinea = Number(p.monto || 0);
      if (Number.isNaN(montoLinea) || montoLinea <= 0) {
        return `Ingresá un monto mayor a 0 en el pago #${i + 1}.`;
      }
      if (esTipoCheque(p.tipo_pago_id)) {
        if (!p.cheque.numero_cheque.trim() || !p.cheque.banco.trim()) {
          return `Completá número de cheque y banco en el pago #${i + 1}.`;
        }
        const fechaCobroLimpia = String(p.cheque.fecha_cobro || "").slice(
          0,
          10,
        );
        if (!fechaCobroLimpia) {
          return `Indicá la fecha de cobro del cheque en el pago #${i + 1}.`;
        }
        if (fechaCobroLimpia < fechaHoy) {
          return `La fecha de cobro del cheque en el pago #${i + 1} no puede ser anterior a hoy.`;
        }
      }
    }

    if (sumaPagos > clienteDeudorSeleccionado.saldoPendiente) {
      return `El pago (${formatearMoneda(sumaPagos)}) supera el saldo pendiente del cliente (${formatearMoneda(clienteDeudorSeleccionado.saldoPendiente)}).`;
    }

    return "";
  };

  const ejecutarRegistroPagoConfirmado = async (datosConfirmados) => {
    const {
      clienteIdNum,
      clienteNombre,
      fechaPagoValor,
      pagosACargar,
      montoTotalRegistrado,
    } = datosConfirmados;

    setGuardandoPago(true);
    try {
      for (const p of pagosACargar) {
        const montoLinea = Math.round(Number(p.monto));
        const tipoNum = Number(p.tipo_pago_id);

        const resPago = await api.post("/pagos", {
          cliente_id: clienteIdNum,
          tipo_pago_id: tipoNum,
          fecha: fechaPagoValor,
          monto: montoLinea,
          observacion: p.observacion.trim() || null,
        });

        const pagoIdCreado = resPago.data?.id;

        if (esTipoCheque(p.tipo_pago_id)) {
          await api.post("/cheques", {
            pago_id: pagoIdCreado || null,
            cliente_id: clienteIdNum,
            numero_cheque: p.cheque.numero_cheque.trim(),
            banco: p.cheque.banco.trim(),
            monto: montoLinea,
            fecha_cobro: p.cheque.fecha_cobro || hoyISO(),
            fecha_vencimiento: p.cheque.fecha_cobro || hoyISO(),
            estado: "pendiente",
          });
        }
      }

      setPagosLista([
        crearPagoVacio(buscarIdEfectivo(tiposPago), fechaPagoValor),
      ]);
      setClienteDeudorId("");
      await cargarDatos();

      mostrarAviso(
        "Pago registrado",
        `Se registraron ${formatearMoneda(montoTotalRegistrado)} para ${clienteNombre}.`,
      );

      if (onActualizado) {
        onActualizado();
      }
    } catch (err) {
      console.error("Error registrando pago:", err);
      const msg = err.response?.data?.error || "No se pudo registrar el pago.";
      setErrorPago(msg);
      mostrarAviso("Error al registrar pago", msg, "error");
    } finally {
      setGuardandoPago(false);
    }
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    setErrorPago("");

    const msgError = validarPago();
    if (msgError) {
      setErrorPago(msgError);
      mostrarAviso("Revisá el pago", msgError, "error");
      return;
    }

    const detallePagos = pagosLista.map((p) => {
      const tipoObj = tiposPago.find(
        (tp) => String(tp.id) === String(p.tipo_pago_id),
      );
      const esCheque = esTipoCheque(p.tipo_pago_id);
      return {
        tipoNombre: tipoObj?.nombre || `Tipo #${p.tipo_pago_id}`,
        monto: Math.round(Number(p.monto || 0)),
        observacion: p.observacion.trim(),
        esCheque,
        cheque: esCheque
          ? {
              numero_cheque: p.cheque.numero_cheque.trim(),
              banco: p.cheque.banco.trim(),
              fecha_cobro: p.cheque.fecha_cobro || hoyISO(),
            }
          : null,
      };
    });

    setConfirmacionPago({
      clienteIdNum: Number(clienteDeudorSeleccionado.id),
      clienteNombre: clienteDeudorSeleccionado.nombre,
      saldoAnterior: clienteDeudorSeleccionado.saldoPendiente,
      saldoRestante: clienteDeudorSeleccionado.saldoPendiente - sumaPagos,
      fechaPagoValor: fechaPago,
      montoTotalRegistrado: sumaPagos,
      detallePagos,
      pagosACargar: pagosLista,
    });
  };

  const handleDepositarCheque = async (e, chequeObj) => {
    e.stopPropagation();
    if (!chequeObj?.id) return;

    setDepositandoChequeId(chequeObj.id);
    try {
      const fechaVencLimpia = chequeObj.fecha_vencimiento
        ? String(chequeObj.fecha_vencimiento).slice(0, 10)
        : chequeObj.fecha_cobro
          ? String(chequeObj.fecha_cobro).slice(0, 10)
          : hoyISO();

      try {
        await api.patch(`/cheques/${chequeObj.id}`, {
          estado: "depositado",
          fecha_resolucion: null,
        });
      } catch {
        await api.put(`/cheques/${chequeObj.id}`, {
          pago_id: chequeObj.pago_id ?? null,
          cliente_id: chequeObj.cliente_id,
          numero_cheque: chequeObj.numero_cheque,
          banco: chequeObj.banco,
          monto: chequeObj.monto,
          fecha_vencimiento: fechaVencLimpia,
          fecha_resolucion: null,
          estado: "depositado",
        });
      }

      setCheques((prev) =>
        prev.map((c) =>
          Number(c.id) === Number(chequeObj.id)
            ? { ...c, estado: "depositado", fecha_resolucion: null }
            : c,
        ),
      );
      setChequeSeleccionadoId((prev) =>
        Number(prev) === Number(chequeObj.id) ? null : prev,
      );

      mostrarAviso(
        "Cheque depositado",
        `Cheque N° ${chequeObj.numero_cheque} (${chequeObj.banco}) marcado como depositado.`,
      );

      if (onActualizado) {
        onActualizado();
      }
    } catch (err) {
      console.error("Error depositando cheque:", err);
      const msg =
        err.response?.data?.error ||
        "No se pudo marcar el cheque como depositado.";
      mostrarAviso("Error al depositar", msg, "error");
    } finally {
      setDepositandoChequeId(null);
    }
  };

  const chequesEnriquecidos = useMemo(() => {
    const mapaCli = new Map(clientes.map((c) => [Number(c.id), c.nombre]));
    return cheques.map((ch) => ({
      ...ch,
      clienteNombre:
        ch.cliente_nombre ||
        mapaCli.get(Number(ch.cliente_id)) ||
        `Cliente #${ch.cliente_id}`,
    }));
  }, [cheques, clientes]);

  const chequesFiltrados = useMemo(
    () =>
      chequesEnriquecidos.filter(
        (ch) =>
          String(ch.estado || "pendiente").toLowerCase() === filtroEstadoCheque,
      ),
    [chequesEnriquecidos, filtroEstadoCheque],
  );

  return (
    <div style={styles.container}>
      {createPortal(
        <div style={styles.toastContainer}>
          {toasts.map((t) => (
            <div key={t.id} style={styles.toastCard(t.tipo)}>
              <div style={styles.toastBadge(t.tipo)}>
                {t.tipo === "error" ? "!" : "✓"}
              </div>
              <div>
                <div style={{ fontWeight: "800", fontSize: "0.94rem" }}>
                  {t.titulo}
                </div>
                <div style={{ fontSize: "0.84rem", color: "#475569" }}>
                  {t.mensaje}
                </div>
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}

      <div style={styles.layoutGrid}>
        {/* COLUMNA IZQUIERDA: Clientes con pagos pendientes + Registrar Pago al seleccionar */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>
              {clienteDeudorSeleccionado
                ? "Pago de Cliente"
                : `Clientes con Saldo Pendiente (${clientesConPendiente.length})`}
            </h2>

            {clienteDeudorSeleccionado && (
              <button
                type="button"
                onClick={handleVolverAListaClientes}
                style={styles.btnVolverChico}
              >
                ← Volver
              </button>
            )}
          </div>

          {!clienteDeudorSeleccionado ? (
            clientesConPendiente.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  color: "#475569",
                  fontSize: "0.9rem",
                }}
              >
                No hay clientes con pagos pendientes.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "460px",
                  overflowY: "auto",
                  paddingRight: "2px",
                }}
              >
                {clientesConPendiente.map((cli) => (
                  <button
                    key={cli.id}
                    type="button"
                    onClick={() => handleSeleccionarCliente(cli.id)}
                    style={styles.deudorItem}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: "800",
                          fontSize: "0.92rem",
                          color: "#0f172a",
                        }}
                      >
                        {cli.nombre}
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        Trabajos: {formatearMoneda(cli.totalTrabajos)} · Pagado:{" "}
                        {formatearMoneda(cli.totalPagado)}
                      </div>
                    </div>

                    <div
                      style={{
                        fontWeight: "900",
                        fontSize: "0.95rem",
                        color: "#b91c1c",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatearMoneda(cli.saldoPendiente)}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <>
              <div style={styles.deudorResumenBox}>
                <div>
                  <div
                    style={{
                      fontWeight: "800",
                      fontSize: "0.96rem",
                      color: "#0f172a",
                    }}
                  >
                    {clienteDeudorSeleccionado.nombre}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "#475569",
                      marginTop: "2px",
                    }}
                  >
                    Trabajos:{" "}
                    {formatearMoneda(clienteDeudorSeleccionado.totalTrabajos)} ·
                    Pagado:{" "}
                    {formatearMoneda(clienteDeudorSeleccionado.totalPagado)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  >
                    Saldo pendiente
                  </div>
                  <div
                    style={{
                      fontWeight: "900",
                      fontSize: "1rem",
                      color: "#b91c1c",
                    }}
                  >
                    {formatearMoneda(clienteDeudorSeleccionado.saldoPendiente)}
                  </div>
                </div>
              </div>

              <form onSubmit={handleRegistrarPago} style={styles.section}>
                <div style={styles.colHeader}>
                  <h3 style={styles.sectionTitle}>Registrar Pago</h3>

                  <button
                    type="button"
                    onClick={agregarLineaPago}
                    style={styles.btnMiniColor("#1d4ed8")}
                  >
                    + Agregar forma de pago
                  </button>
                </div>

                {errorPago && <div style={styles.alertaError}>{errorPago}</div>}

                <div style={{ marginBottom: "10px", maxWidth: "200px" }}>
                  <label style={styles.label}>Fecha de Pago *</label>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {pagosLista.map((p, idx) => {
                    const esCheque = esTipoCheque(p.tipo_pago_id);
                    return (
                      <div
                        key={p.uid}
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: "10px",
                          padding: "11px",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: "800",
                              color: "#334155",
                            }}
                          >
                            Pago #{idx + 1}
                          </span>

                          {pagosLista.length > 1 && (
                            <button
                              type="button"
                              onClick={() => quitarLineaPago(p.uid)}
                              style={styles.btnQuitarPago}
                            >
                              Quitar
                            </button>
                          )}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: "8px",
                          }}
                        >
                          <div>
                            <label style={styles.label}>Tipo de Pago *</label>
                            <select
                              value={p.tipo_pago_id}
                              onChange={(e) =>
                                actualizarPago(p.uid, {
                                  tipo_pago_id: e.target.value,
                                })
                              }
                              style={styles.select}
                            >
                              {tiposPago.map((tp) => (
                                <option key={tp.id} value={tp.id}>
                                  {tp.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={styles.label}>Monto Pagado *</label>
                            <input
                              type="number"
                              step="1"
                              inputMode="numeric"
                              placeholder="0"
                              value={p.monto}
                              onChange={(e) =>
                                actualizarPago(p.uid, { monto: e.target.value })
                              }
                              style={styles.input}
                            />
                          </div>

                          <div>
                            <label style={styles.label}>Observación</label>
                            <input
                              type="text"
                              placeholder="Opcional"
                              value={p.observacion}
                              onChange={(e) =>
                                actualizarPago(p.uid, {
                                  observacion: e.target.value,
                                })
                              }
                              style={styles.input}
                            />
                          </div>
                        </div>

                        {esCheque && (
                          <div
                            style={{
                              borderTop: "1px dashed #cbd5e1",
                              paddingTop: "9px",
                              marginTop: "9px",
                            }}
                          >
                            <div
                              style={{ ...styles.label, marginBottom: "6px" }}
                            >
                              Datos del Cheque ({formatearMoneda(p.monto)}) ·
                              Estado inicial: Pendiente
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(145px, 1fr))",
                                gap: "8px",
                              }}
                            >
                              <div>
                                <label style={styles.label}>
                                  Número de Cheque *
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Ej: 12345678"
                                  value={p.cheque.numero_cheque}
                                  onChange={(e) =>
                                    actualizarChequePago(p.uid, {
                                      numero_cheque: e.target.value,
                                    })
                                  }
                                  style={styles.input}
                                />
                              </div>

                              <div>
                                <label style={styles.label}>Banco *</label>
                                <input
                                  type="text"
                                  placeholder="Ej: Banco Provincia"
                                  value={p.cheque.banco}
                                  onChange={(e) =>
                                    actualizarChequePago(p.uid, {
                                      banco: e.target.value,
                                    })
                                  }
                                  style={styles.input}
                                />
                              </div>

                              <div>
                                <label style={styles.label}>
                                  Fecha de Cobro
                                </label>
                                <input
                                  type="date"
                                  min={hoyMin}
                                  value={p.cheque.fecha_cobro}
                                  onChange={(e) =>
                                    actualizarChequePago(p.uid, {
                                      fecha_cobro: e.target.value,
                                    })
                                  }
                                  style={styles.input}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "12px",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.86rem",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    Total a pagar: {formatearMoneda(sumaPagos)}
                  </span>

                  <button
                    type="submit"
                    disabled={guardandoPago}
                    style={{
                      ...styles.btnSuccess,
                      opacity: guardandoPago ? 0.6 : 1,
                    }}
                  >
                    {guardandoPago ? "Guardando..." : "Registrar Pago"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* COLUMNA DERECHA: Cheques */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>
              Cheques ({chequesFiltrados.length})
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "12px",
            }}
          >
            {ESTADOS_CHEQUE.map((est) => {
              const cant = chequesEnriquecidos.filter(
                (c) =>
                  String(c.estado || "pendiente").toLowerCase() === est.key,
              ).length;
              const activa = filtroEstadoCheque === est.key;
              return (
                <button
                  key={est.key}
                  type="button"
                  onClick={() => {
                    setFiltroEstadoCheque(est.key);
                    setChequeSeleccionadoId(null);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "999px",
                    border: activa
                      ? `1.5px solid ${est.color}`
                      : `1px solid ${est.border}`,
                    backgroundColor: activa ? est.bg : "#ffffff",
                    color: est.color,
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {est.label} ({cant})
                </button>
              );
            })}
          </div>

          <div style={styles.ficheroContenedor}>
            {chequesFiltrados.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 10px",
                  color: "#64748b",
                  fontSize: "0.88rem",
                }}
              >
                No hay cheques en este estado.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "430px",
                  overflowY: "auto",
                  padding: "4px 2px 6px",
                }}
              >
                {chequesFiltrados.map((ch) => {
                  const activa = Number(chequeSeleccionadoId) === Number(ch.id);
                  const levantada =
                    activa || Number(chequeHoverId) === Number(ch.id);
                  const st = estiloEstado(ch.estado);
                  const diasInfo = obtenerInfoDiasCheque(ch);
                  const esPendiente =
                    String(ch.estado || "pendiente").toLowerCase() ===
                    "pendiente";
                  const ocupadoDeposito =
                    Number(depositandoChequeId) === Number(ch.id);

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() =>
                        setChequeSeleccionadoId((prev) =>
                          Number(prev) === Number(ch.id) ? null : ch.id,
                        )
                      }
                      onMouseEnter={() => setChequeHoverId(ch.id)}
                      onMouseLeave={() => setChequeHoverId(null)}
                      style={styles.chequeFicha(activa, levantada)}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "900",
                            fontSize: "0.86rem",
                            color: "#0f172a",
                          }}
                        >
                          {ch.banco} · N° {ch.numero_cheque}
                        </span>

                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: "800",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            backgroundColor: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                          }}
                        >
                          {st.label}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: "8px",
                          marginTop: "4px",
                        }}
                      >
                        <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                          {ch.clienteNombre} · Cobro:{" "}
                          {formatearFechaCorta(
                            ch.fecha_cobro || ch.fecha_vencimiento,
                          )}
                        </span>

                        <span
                          style={{
                            fontWeight: "900",
                            fontSize: "0.92rem",
                            color: "#0f172a",
                          }}
                        >
                          {formatearMoneda(ch.monto)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            color:
                              diasInfo.urgencia === "danger"
                                ? "#b91c1c"
                                : diasInfo.urgencia === "warn"
                                  ? "#b45309"
                                  : "#1e40af",
                          }}
                        >
                          {diasInfo.textoPrincipal}
                        </span>

                        {esPendiente && (
                          <button
                            type="button"
                            disabled={ocupadoDeposito}
                            onClick={(e) => handleDepositarCheque(e, ch)}
                            style={styles.btnDepositar(ocupadoDeposito)}
                          >
                            {ocupadoDeposito ? "Depositando..." : "Depositar"}
                          </button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Confirmación antes de enviar POSTs de pago */}
      {confirmacionPago &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setConfirmacionPago(null)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "1.15rem",
                  fontWeight: "800",
                }}
              >
                ¿Estás seguro de registrar este pago?
              </h3>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "0.85rem",
                  color: "#475569",
                }}
              >
                Verificá los datos antes de enviar el registro:
              </p>

              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "11px 13px",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.85rem",
                  marginBottom: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                }}
              >
                <div>
                  <strong>Cliente:</strong> {confirmacionPago.clienteNombre}
                </div>
                <div>
                  <strong>Fecha de pago:</strong>{" "}
                  {formatearFechaCorta(confirmacionPago.fechaPagoValor)}
                </div>
                <div>
                  <strong>Saldo pendiente actual:</strong>{" "}
                  {formatearMoneda(confirmacionPago.saldoAnterior)}
                </div>
                <div>
                  <strong>Saldo restante estimado:</strong>{" "}
                  <span style={{ color: "#15803d", fontWeight: "800" }}>
                    {formatearMoneda(confirmacionPago.saldoRestante)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                {confirmacionPago.detallePagos.map((dp, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "9px 11px",
                      backgroundColor: "#ffffff",
                      fontSize: "0.84rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: "800",
                      }}
                    >
                      <span>
                        Pago #{i + 1} · {dp.tipoNombre}
                      </span>
                      <span>{formatearMoneda(dp.monto)}</span>
                    </div>
                    {dp.observacion && (
                      <div style={{ fontSize: "0.78rem", color: "#475569" }}>
                        Obs.: {dp.observacion}
                      </div>
                    )}
                    {dp.esCheque && dp.cheque && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#1e3a8a",
                          fontWeight: "600",
                          marginTop: "4px",
                        }}
                      >
                        Cheque N° {dp.cheque.numero_cheque} · {dp.cheque.banco}{" "}
                        · Cobro: {formatearFechaCorta(dp.cheque.fecha_cobro)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontWeight: "800", fontSize: "0.9rem" }}>
                  Total:{" "}
                  {formatearMoneda(confirmacionPago.montoTotalRegistrado)}
                </span>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setConfirmacionPago(null)}
                    style={styles.btnSecondary}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={guardandoPago}
                    onClick={async () => {
                      const datos = confirmacionPago;
                      setConfirmacionPago(null);
                      await ejecutarRegistroPagoConfirmado(datos);
                    }}
                    style={styles.btnSuccess}
                  >
                    Sí, registrar pago
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
