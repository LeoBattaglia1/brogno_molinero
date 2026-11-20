import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";

const OPCIONES_MAQUINA = ["6 pies", "8 pies", "10 pies"];
const OPCIONES_CILINDRO = [
  "3 pulgadas",
  "3.5 pulgadas",
  "4 pulgadas",
  "5 pulgadas",
  "6 pulgadas",
];

// Esquina de 25 de Mayo y 9 de Julio, Ayacucho (Provincia de Buenos Aires)
const PUNTO_REFERENCIA = {
  lat: -37.1528,
  lng: -58.4889,
  etiqueta: "25 de Mayo y 9 de Julio, Ayacucho",
};

const STORAGE_RUTAS_CAMPOS_KEY = "brogno_molinero_rutas_campos_v1";
const ANCHO_LISTA_CLIENTES = "240px";
const ALTO_PANELES = "450px";

function leerRutasGuardadas() {
  try {
    const raw = localStorage.getItem(STORAGE_RUTAS_CAMPOS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function guardarRutaCampoLocal(campoId, datosRuta) {
  if (!campoId) return;
  try {
    const actual = leerRutasGuardadas();
    actual[String(campoId)] = datosRuta;
    localStorage.setItem(STORAGE_RUTAS_CAMPOS_KEY, JSON.stringify(actual));
  } catch (err) {
    console.error("Error guardando ruta de campo:", err);
  }
}

function normalizarFechaISO(valor) {
  if (!valor) return "";
  const str = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatearFechaAR(valor) {
  const iso = normalizarFechaISO(valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return valor || "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatearMoneda(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}

function calcularDistanciaRectaKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

async function calcularRutaReal(latOrigen, lngOrigen, latDestino, lngDestino) {
  const url = `https://router.project-osrm.org/route/v1/driving/${lngOrigen},${latOrigen};${lngDestino},${latDestino}?overview=full&geometries=geojson`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Error consultando ruta");
  const data = await resp.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No se encontró camino hasta ese punto");
  }

  const ruta = data.routes[0];
  const km = Number((ruta.distance / 1000).toFixed(1));
  const coordenadas = ruta.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  return { km, coordenadas };
}

function cargarLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("No se pudo cargar el mapa"));
    document.body.appendChild(script);
  });
}

const styles = {
  container: {
    padding: "4px 2px 4px 2px",
    maxWidth: "none",
    width: "100%",
    minWidth: "0",
    margin: "0",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  searchBarContainer: {
    display: "grid",
    gridTemplateColumns: `${ANCHO_LISTA_CLIENTES} minmax(0, 1fr)`,
    alignItems: "center",
    marginBottom: "10px",
    gap: "10px",
    width: "100%",
  },
  panelGrid: {
    display: "grid",
    gridTemplateColumns: `${ANCHO_LISTA_CLIENTES} minmax(0, 1fr)`,
    gap: "10px",
    alignItems: "stretch",
    width: "100%",
  },
  cardLeft: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "8px",
    boxShadow: "0 4px 12px rgba(56, 44, 161, 0.12)",
    minWidth: 0,
    height: ALTO_PANELES,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  cardRight: {
    backgroundColor: "rgba(248, 250, 252, 0.97)",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
    minHeight: ALTO_PANELES,
    boxShadow: "0 4px 12px rgba(83, 201, 28, 0.12)",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: "0.92rem",
  },
  td: {
    padding: "10px 10px",
    textAlign: "left",
    borderBottom: "1px solid #f1f5f9",
    color: "#1e293b",
    verticalAlign: "middle",
    wordBreak: "break-word",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.96rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
    width: "100%",
  },
  inputFiltroInline: {
    padding: "7px 10px",
    borderRadius: "8px",
    border: "1px solid #94a3b8",
    fontSize: "0.86rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
  },
  select: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.96rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
    width: "100%",
  },
  btnPrimary: {
    padding: "10px 16px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.95rem",
  },
  btnSecondary: {
    padding: "11px 20px",
    backgroundColor: "#64748b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.95rem",
  },
  btnSuccess: {
    padding: "11px 22px",
    background: "linear-gradient(135deg, #2e6f40 0%, #1d4d2b 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.96rem",
    fontWeight: "700",
    boxShadow: "0 4px 12px rgba(46, 111, 64, 0.35)",
  },
  btnEditarDiscreto: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.8rem",
    flexShrink: 0,
    transition: "all 0.15s ease",
  },
  btnVerMapaCampo: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 8px",
    borderRadius: "6px",
    border: "1px solid #93c5fd",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.75rem",
    lineHeight: 1.3,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  btnMapa: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #94a3b8",
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  },
  btnVerDetalle: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 14px",
    borderRadius: "9px",
    border: "1px solid #99f6e4",
    background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
    color: "#0f766e",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.86rem",
    letterSpacing: "0.01em",
    boxShadow: "0 2px 8px rgba(15, 118, 110, 0.14)",
    transition: "all 0.18s ease",
  },
  campoRuralCard: (index) => {
    const temas = [
      { bg: "#f7f5eb", border: "#c8be96", header: "#e9e3c8" },
      { bg: "#eff5ec", border: "#b3cca8", header: "#dce9d5" },
      { bg: "#f8f1e7", border: "#d6be9c", header: "#ebd9be" },
      { bg: "#eef3f0", border: "#b4c7bd", header: "#d8e5de" },
    ];
    const tema = temas[index % temas.length];
    return {
      border: `1px solid ${tema.border}`,
      borderRadius: "10px",
      backgroundColor: tema.bg,
      overflow: "hidden",
      boxShadow: "0 2px 6px rgba(41, 37, 24, 0.06)",
      color: "#1f291d",
      headerBg: tema.header,
    };
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
    zIndex: 2000,
    boxSizing: "border-box",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "26px 30px",
    borderRadius: "14px",
    maxWidth: "900px",
    width: "92vw",
    boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.4)",
    maxHeight: "90vh",
    overflowY: "auto",
    textAlign: "left",
    position: "relative",
    boxSizing: "border-box",
  },
  btnCloseX: {
    position: "absolute",
    top: "18px",
    right: "20px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    width: "36px",
    height: "36px",
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#334155",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    display: "block",
    fontSize: "0.88rem",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "6px",
  },
  alertaInline: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: "12px 14px",
    borderRadius: "8px",
    fontSize: "0.92rem",
    fontWeight: "600",
    marginBottom: "16px",
  },
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
    padding: "14px 18px",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    border: `1px solid ${tipo === "error" ? "#fecaca" : "#bbf7d0"}`,
    borderLeft: `6px solid ${tipo === "error" ? "#dc2626" : "#16a34a"}`,
    boxShadow: "0 14px 30px -6px rgba(15, 23, 42, 0.22)",
  }),
  toastBadge: (tipo) => ({
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontWeight: "800",
    fontSize: "1rem",
    backgroundColor: tipo === "error" ? "#fee2e2" : "#dcfce7",
    color: tipo === "error" ? "#dc2626" : "#15803d",
  }),
  filtroChip: (activo) => ({
    padding: "7px 12px",
    borderRadius: "8px",
    border: activo ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
    backgroundColor: activo ? "#2563eb" : "#f8fafc",
    color: activo ? "#ffffff" : "#334155",
    fontWeight: "700",
    fontSize: "0.84rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  }),
  detalleTh: {
    padding: "9px 10px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontSize: "0.78rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    borderBottom: "2px solid #cbd5e1",
    textAlign: "left",
  },
  detalleTd: {
    padding: "9px 10px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "0.86rem",
    color: "#1e293b",
    verticalAlign: "middle",
  },
};

function IconoLapiz({ size = 14 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconoDetalle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconoMapa({ size = 16 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

const molinoVacio = () => ({
  nombre: "",
  maquina: OPCIONES_MAQUINA[0],
  cilindro: OPCIONES_CILINDRO[0],
});

const campoVacio = () => ({
  nombre: "",
  distancia: "",
  rutaMapa: null,
  molinos: [molinoVacio()],
});

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [campos, setCampos] = useState([]);
  const [molinos, setMolinos] = useState([]);
  const [trabajos, setTrabajos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [rutasCampos, setRutasCampos] = useState(() => leerRutasGuardadas());

  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [toasts, setToasts] = useState([]);

  const mostrarAviso = useCallback((titulo, mensaje, tipo = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, titulo, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  // Modal Cliente (Nuevo / Editar)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [errorFormCliente, setErrorFormCliente] = useState("");
  const [formCliente, setFormCliente] = useState({
    id: "",
    nombre: "",
    cuit: "",
    telefono: "",
  });
  const [formCampos, setFormCampos] = useState([campoVacio()]);

  // Modal Campo y Molinos
  const [modalCampoAbierto, setModalCampoAbierto] = useState(false);
  const [campoEditando, setCampoEditando] = useState(null);
  const [errorFormCampo, setErrorFormCampo] = useState("");
  const [formCampoIndividual, setFormCampoIndividual] = useState({
    nombre: "",
    distancia: "",
    rutaMapa: null,
  });
  const [molinosEditablesCampo, setMolinosEditablesCampo] = useState([]);
  const [nuevoMolino, setNuevoMolino] = useState(molinoVacio());

  // Modal Detalle del Cliente
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [tipoFiltroTiempo, setTipoFiltroTiempo] = useState("todo"); // todo | dia | rango | mes | anio
  const [fechaDia, setFechaDia] = useState(() =>
    normalizarFechaISO(new Date()),
  );
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [anioFiltro, setAnioFiltro] = useState(() =>
    String(new Date().getFullYear()),
  );

  // Modal Mapa: modo "seleccionar" o "ver"
  const [modalMapaAbierto, setModalMapaAbierto] = useState(false);
  const [modoMapa, setModoMapa] = useState("seleccionar"); // seleccionar | ver
  const [rutaVisualizacion, setRutaVisualizacion] = useState(null);
  const [destinoMapa, setDestinoMapa] = useState(null);
  const [distanciaCalculadaMapa, setDistanciaCalculadaMapa] = useState(null);
  const [coordenadasRutaCalculada, setCoordenadasRutaCalculada] = useState([]);
  const [calculandoRuta, setCalculandoRuta] = useState(false);
  const [esRutaPorCamino, setEsRutaPorCamino] = useState(true);
  const [onSeleccionarMapa, setOnSeleccionarMapa] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerDestinoRef = useRef(null);
  const rutaLayerRef = useRef(null);

  useEffect(() => {
    const hayModalAbierto =
      modalAbierto ||
      modalCampoAbierto ||
      modalMapaAbierto ||
      modalDetalleAbierto;
    document.body.style.overflow = hayModalAbierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalAbierto, modalCampoAbierto, modalMapaAbierto, modalDetalleAbierto]);

  const cargarDatos = useCallback(async () => {
    try {
      const [resCli, resCam, resMol, resTra, resPag] = await Promise.all([
        api.get("/clientes"),
        api.get("/campos"),
        api.get("/molinos"),
        api.get("/trabajos").catch(() => ({ data: [] })),
        api.get("/pagos").catch(() => ({ data: [] })),
      ]);

      const listaClientes = Array.isArray(resCli.data) ? resCli.data : [];
      setClientes(listaClientes);
      setCampos(Array.isArray(resCam.data) ? resCam.data : []);
      setMolinos(Array.isArray(resMol.data) ? resMol.data : []);
      setTrabajos(Array.isArray(resTra.data) ? resTra.data : []);
      setPagos(Array.isArray(resPag.data) ? resPag.data : []);
      setRutasCampos(leerRutasGuardadas());

      setClienteSeleccionado((prev) => {
        if (!prev) return null;
        return (
          listaClientes.find((c) => Number(c.id) === Number(prev.id)) || null
        );
      });
    } catch (error) {
      console.error("Error al cargar datos de clientes:", error);
      mostrarAviso(
        "Error de conexión",
        "No se pudieron cargar los datos desde el servidor.",
        "error",
      );
    }
  }, [mostrarAviso]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Filtro de fechas para trabajos y pagos del modal de detalle
  const cumpleFiltroTiempo = useCallback(
    (fechaRaw) => {
      if (tipoFiltroTiempo === "todo") return true;
      const iso = normalizarFechaISO(fechaRaw);
      if (!iso) return false;

      if (tipoFiltroTiempo === "dia") {
        if (!fechaDia) return true;
        return iso === fechaDia;
      }
      if (tipoFiltroTiempo === "rango") {
        if (fechaDesde && iso < fechaDesde) return false;
        if (fechaHasta && iso > fechaHasta) return false;
        return true;
      }
      if (tipoFiltroTiempo === "mes") {
        if (!mesFiltro) return true;
        return iso.startsWith(mesFiltro);
      }
      if (tipoFiltroTiempo === "anio") {
        if (!anioFiltro) return true;
        return iso.startsWith(`${anioFiltro}-`);
      }
      return true;
    },
    [tipoFiltroTiempo, fechaDia, fechaDesde, fechaHasta, mesFiltro, anioFiltro],
  );

  const abrirModalDetalle = () => {
    if (!clienteSeleccionado) return;
    setTipoFiltroTiempo("todo");
    setModalDetalleAbierto(true);
  };

  // Deuda total histórica del cliente (independiente del filtro seleccionado)
  const deudaTotalCliente = useMemo(() => {
    if (!clienteSeleccionado) return 0;
    const clienteIdNum = Number(clienteSeleccionado.id);

    const totalTrabajosHistorico = trabajos
      .filter((t) => Number(t.cliente_id) === clienteIdNum)
      .reduce((acc, t) => acc + Number(t.monto || 0), 0);

    const totalPagosHistorico = pagos
      .filter((p) => Number(p.cliente_id) === clienteIdNum)
      .reduce((acc, p) => acc + Number(p.monto || 0), 0);

    return Number((totalTrabajosHistorico - totalPagosHistorico).toFixed(2));
  }, [clienteSeleccionado, trabajos, pagos]);

  // Datos filtrados para tablas de trabajos y pagos
  const datosDetalle = useMemo(() => {
    if (!clienteSeleccionado) {
      return {
        trabajosAgrupados: [],
        pagosFiltrados: [],
        totalTrabajos: 0,
        totalPagos: 0,
      };
    }

    const clienteIdNum = Number(clienteSeleccionado.id);

    const registrosTrabajo = trabajos
      .filter(
        (t) =>
          Number(t.cliente_id) === clienteIdNum && cumpleFiltroTiempo(t.fecha),
      )
      .sort((a, b) => {
        const fa = normalizarFechaISO(a.fecha);
        const fb = normalizarFechaISO(b.fecha);
        if (fa !== fb) return fb.localeCompare(fa);
        return Number(b.id) - Number(a.id);
      });

    const gruposMap = new Map();

    for (const tr of registrosTrabajo) {
      const fIso = normalizarFechaISO(tr.fecha);
      const campoObj = campos.find((c) => Number(c.id) === Number(tr.campo_id));
      const molinoObj = molinos.find(
        (m) => Number(m.id) === Number(tr.molino_id),
      );

      const campoNombre = tr.campo_nombre || campoObj?.nombre || "-";
      const molinoNombre = tr.molino_nombre || molinoObj?.nombre || "";
      const desc = (tr.descripcion || "").trim();
      const claveGrupo = `${fIso}__${tr.campo_id ?? campoNombre}__${desc.toLowerCase()}`;

      if (!gruposMap.has(claveGrupo)) {
        gruposMap.set(claveGrupo, {
          key: claveGrupo,
          fecha: tr.fecha,
          fechaIso: fIso,
          campoNombre,
          molinosSet: new Set(molinoNombre ? [molinoNombre] : []),
          descripciones: desc ? [desc] : [],
          montoNum: Number(tr.monto || 0),
        });
      } else {
        const actual = gruposMap.get(claveGrupo);
        if (molinoNombre) actual.molinosSet.add(molinoNombre);
        if (desc && !actual.descripciones.includes(desc)) {
          actual.descripciones.push(desc);
        }
        actual.montoNum += Number(tr.monto || 0);
      }
    }

    const trabajosAgrupados = Array.from(gruposMap.values()).map((g) => ({
      key: g.key,
      fecha: g.fecha,
      campoNombre: g.campoNombre,
      molinosTexto: Array.from(g.molinosSet).join(", "),
      descripcion:
        g.descripciones.length > 0 ? g.descripciones.join(" · ") : "-",
      montoNum: g.montoNum,
    }));

    const pagosFiltrados = pagos
      .filter(
        (p) =>
          Number(p.cliente_id) === clienteIdNum && cumpleFiltroTiempo(p.fecha),
      )
      .sort((a, b) => {
        const fa = normalizarFechaISO(a.fecha);
        const fb = normalizarFechaISO(b.fecha);
        if (fa !== fb) return fb.localeCompare(fa);
        return Number(b.id) - Number(a.id);
      })
      .map((pg) => ({
        ...pg,
        tipoPagoTexto:
          pg.tipo_pago_nombre ||
          pg.tipo_pago ||
          (pg.tipo_pago_id ? `Tipo #${pg.tipo_pago_id}` : "-"),
        montoNum: Number(pg.monto || 0),
      }));

    const totalTrabajos = trabajosAgrupados.reduce(
      (acc, tr) => acc + tr.montoNum,
      0,
    );
    const totalPagos = pagosFiltrados.reduce((acc, pg) => acc + pg.montoNum, 0);

    return {
      trabajosAgrupados,
      pagosFiltrados,
      totalTrabajos,
      totalPagos,
    };
  }, [
    clienteSeleccionado,
    trabajos,
    pagos,
    campos,
    molinos,
    cumpleFiltroTiempo,
  ]);

  // Inicializar mapa para seleccionar distancia o visualizar recorrido guardado
  useEffect(() => {
    if (!modalMapaAbierto) return;

    let activo = true;
    setDestinoMapa(null);
    setDistanciaCalculadaMapa(null);
    setCoordenadasRutaCalculada([]);
    setCalculandoRuta(false);
    setEsRutaPorCamino(true);

    cargarLeaflet()
      .then((L) => {
        if (!activo || !mapContainerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current).setView(
          [PUNTO_REFERENCIA.lat, PUNTO_REFERENCIA.lng],
          12,
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 18,
        }).addTo(map);

        L.circleMarker([PUNTO_REFERENCIA.lat, PUNTO_REFERENCIA.lng], {
          radius: 9,
          color: "#1d4ed8",
          fillColor: "#2563eb",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup(PUNTO_REFERENCIA.etiqueta);

        if (modoMapa === "ver" && rutaVisualizacion) {
          const destino = rutaVisualizacion.destino;
          const coords =
            Array.isArray(rutaVisualizacion.coordenadas) &&
            rutaVisualizacion.coordenadas.length > 0
              ? rutaVisualizacion.coordenadas
              : [
                  [PUNTO_REFERENCIA.lat, PUNTO_REFERENCIA.lng],
                  ...(destino ? [[destino.lat, destino.lng]] : []),
                ];

          if (destino) {
            markerDestinoRef.current = L.marker([destino.lat, destino.lng])
              .addTo(map)
              .bindPopup(rutaVisualizacion.titulo || "Campo");
          }

          if (coords.length > 1) {
            rutaLayerRef.current = L.polyline(coords, {
              color: "#2563eb",
              weight: 5,
              opacity: 0.88,
            }).addTo(map);

            map.fitBounds(rutaLayerRef.current.getBounds(), {
              padding: [45, 45],
            });
          }
        } else if (modoMapa === "seleccionar") {
          map.on("click", async (e) => {
            const { lat, lng } = e.latlng;

            if (markerDestinoRef.current) {
              markerDestinoRef.current.setLatLng([lat, lng]);
            } else {
              markerDestinoRef.current = L.marker([lat, lng]).addTo(map);
            }

            if (rutaLayerRef.current) {
              rutaLayerRef.current.remove();
              rutaLayerRef.current = null;
            }

            setDestinoMapa({ lat, lng });
            setCalculandoRuta(true);
            setDistanciaCalculadaMapa(null);
            setCoordenadasRutaCalculada([]);

            try {
              const { km, coordenadas } = await calcularRutaReal(
                PUNTO_REFERENCIA.lat,
                PUNTO_REFERENCIA.lng,
                lat,
                lng,
              );
              if (!activo) return;

              rutaLayerRef.current = L.polyline(coordenadas, {
                color: "#2563eb",
                weight: 5,
                opacity: 0.85,
              }).addTo(map);

              map.fitBounds(rutaLayerRef.current.getBounds(), {
                padding: [40, 40],
              });

              setCoordenadasRutaCalculada(coordenadas);
              setDistanciaCalculadaMapa(km);
              setEsRutaPorCamino(true);
            } catch {
              if (!activo) return;
              const kmRecto = calcularDistanciaRectaKm(
                PUNTO_REFERENCIA.lat,
                PUNTO_REFERENCIA.lng,
                lat,
                lng,
              );
              const coordsRectas = [
                [PUNTO_REFERENCIA.lat, PUNTO_REFERENCIA.lng],
                [lat, lng],
              ];
              rutaLayerRef.current = L.polyline(coordsRectas, {
                color: "#d97706",
                weight: 4,
                dashArray: "8, 8",
              }).addTo(map);

              setCoordenadasRutaCalculada(coordsRectas);
              setDistanciaCalculadaMapa(kmRecto);
              setEsRutaPorCamino(false);
            } finally {
              if (activo) setCalculandoRuta(false);
            }
          });
        }

        mapInstanceRef.current = map;
        setTimeout(() => map.invalidateSize(), 120);
      })
      .catch(() => {
        mostrarAviso(
          "Mapa no disponible",
          "No se pudo cargar el mapa. Revisá tu conexión a internet.",
          "error",
        );
      });

    return () => {
      activo = false;
      markerDestinoRef.current = null;
      rutaLayerRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [modalMapaAbierto, modoMapa, rutaVisualizacion, mostrarAviso]);

  const abrirSelectorMapa = (callbackSeleccion) => {
    setModoMapa("seleccionar");
    setRutaVisualizacion(null);
    setOnSeleccionarMapa(() => callbackSeleccion);
    setModalMapaAbierto(true);
  };

  const abrirVerRecorridoCampo = (cmp) => {
    const infoRuta = rutasCampos[String(cmp.id)];
    if (!infoRuta || !infoRuta.destino) return;
    setModoMapa("ver");
    setRutaVisualizacion({
      ...infoRuta,
      titulo: `${cmp.nombre} (${cmp.distancia ?? infoRuta.km} km)`,
    });
    setModalMapaAbierto(true);
  };

  const confirmarDistanciaMapa = () => {
    if (distanciaCalculadaMapa == null || !destinoMapa) return;
    const payload = {
      km: distanciaCalculadaMapa,
      destino: destinoMapa,
      coordenadas: coordenadasRutaCalculada,
    };
    if (onSeleccionarMapa) {
      onSeleccionarMapa(payload);
    }
    setModalMapaAbierto(false);
    mostrarAviso(
      "Distancia por camino cargada",
      `Se cargaron ${distanciaCalculadaMapa} km desde ${PUNTO_REFERENCIA.etiqueta}.`,
    );
  };

  const clientesFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((cli) =>
      String(cli.nombre || "")
        .toLowerCase()
        .includes(term),
    );
  }, [clientes, busqueda]);

  const camposDelCliente = useMemo(
    () =>
      campos.filter(
        (c) => Number(c.cliente_id) === Number(clienteSeleccionado?.id),
      ),
    [campos, clienteSeleccionado],
  );

  const validarClienteRepetido = (nombre, cuit, idActual = null) => {
    const nombreNorm = String(nombre || "")
      .trim()
      .toLowerCase();
    const cuitNorm = String(cuit || "")
      .trim()
      .toLowerCase();

    const mismoNombre = clientes.some(
      (c) =>
        Number(c.id) !== Number(idActual) &&
        String(c.nombre || "")
          .trim()
          .toLowerCase() === nombreNorm,
    );
    if (mismoNombre) {
      return `Ya existe un cliente registrado con el nombre "${nombre.trim()}".`;
    }

    if (cuitNorm) {
      const mismoCuit = clientes.some(
        (c) =>
          Number(c.id) !== Number(idActual) &&
          String(c.cuit || "")
            .trim()
            .toLowerCase() === cuitNorm,
      );
      if (mismoCuit) {
        return `Ya existe otro cliente registrado con el CUIT "${cuit.trim()}".`;
      }
    }

    return "";
  };

  const validarCampoRepetido = (
    clienteId,
    nombreCampo,
    idCampoActual = null,
  ) => {
    const nombreNorm = String(nombreCampo || "")
      .trim()
      .toLowerCase();
    if (!nombreNorm) return "";

    const repetido = campos.some(
      (c) =>
        Number(c.cliente_id) === Number(clienteId) &&
        Number(c.id) !== Number(idCampoActual) &&
        String(c.nombre || "")
          .trim()
          .toLowerCase() === nombreNorm,
    );
    if (repetido) {
      return `El campo "${nombreCampo.trim()}" ya existe para este cliente.`;
    }
    return "";
  };

  const validarMolinoRepetido = (
    campoId,
    nombreMolino,
    idMolinoActual = null,
    listaReferencia = molinos,
  ) => {
    const nombreNorm = String(nombreMolino || "")
      .trim()
      .toLowerCase();
    if (!nombreNorm) return "";

    const repetido = listaReferencia.some(
      (m) =>
        Number(m.campo_id) === Number(campoId) &&
        Number(m.id) !== Number(idMolinoActual) &&
        String(m.nombre || "")
          .trim()
          .toLowerCase() === nombreNorm,
    );
    if (repetido) {
      return `El molino "${nombreMolino.trim()}" ya está cargado en este campo.`;
    }
    return "";
  };

  const abrirModalNuevo = () => {
    setModoEdicion(false);
    setErrorFormCliente("");
    setFormCliente({ id: "", nombre: "", cuit: "", telefono: "" });
    setFormCampos([campoVacio()]);
    setModalAbierto(true);
  };

  const abrirModalEdicionCliente = (cli) => {
    setModoEdicion(true);
    setErrorFormCliente("");
    setFormCliente({
      id: cli.id,
      nombre: cli.nombre || "",
      cuit: cli.cuit || "",
      telefono: cli.telefono || "",
    });
    setFormCampos([campoVacio()]);
    setModalAbierto(true);
  };

  const agregarCampoEnFormulario = () => {
    setFormCampos((prev) => [...prev, campoVacio()]);
  };

  const agregarMolinoEnFormulario = (campoIdx) => {
    setFormCampos((prev) =>
      prev.map((cmp, idx) =>
        idx === campoIdx
          ? { ...cmp, molinos: [...cmp.molinos, molinoVacio()] }
          : cmp,
      ),
    );
  };

  const guardarClienteCamposYMolinos = async (e) => {
    e.preventDefault();
    setErrorFormCliente("");

    const nombreLimpio = formCliente.nombre.trim();
    const cuitLimpio = formCliente.cuit.trim();
    const telefonoLimpio = formCliente.telefono.trim();

    if (!nombreLimpio) {
      setErrorFormCliente("Ingresá el nombre del cliente.");
      return;
    }

    const msgClienteRep = validarClienteRepetido(
      nombreLimpio,
      cuitLimpio,
      modoEdicion ? formCliente.id : null,
    );
    if (msgClienteRep) {
      setErrorFormCliente(msgClienteRep);
      mostrarAviso("Dato duplicado", msgClienteRep, "error");
      return;
    }

    const nombresCamposForm = new Set();
    for (const cmp of formCampos) {
      const nombreCamp = cmp.nombre.trim();
      if (!nombreCamp) continue;

      const campLower = nombreCamp.toLowerCase();
      if (nombresCamposForm.has(campLower)) {
        const msg = `El campo "${nombreCamp}" está repetido en el formulario.`;
        setErrorFormCliente(msg);
        mostrarAviso("Campo repetido", msg, "error");
        return;
      }
      nombresCamposForm.add(campLower);

      if (modoEdicion) {
        const msgCampoBD = validarCampoRepetido(
          formCliente.id,
          nombreCamp,
          null,
        );
        if (msgCampoBD) {
          setErrorFormCliente(msgCampoBD);
          mostrarAviso("Campo repetido", msgCampoBD, "error");
          return;
        }
      }

      const nombresMolinosForm = new Set();
      for (const mol of cmp.molinos || []) {
        const nombreMol = mol.nombre.trim();
        if (!nombreMol) continue;

        const molLower = nombreMol.toLowerCase();
        if (nombresMolinosForm.has(molLower)) {
          const msg = `El molino "${nombreMol}" está repetido dentro del campo "${nombreCamp}".`;
          setErrorFormCliente(msg);
          mostrarAviso("Molino repetido", msg, "error");
          return;
        }
        nombresMolinosForm.add(molLower);
      }
    }

    try {
      let clienteIdDestino = formCliente.id;

      if (modoEdicion) {
        await api.put(`/clientes/${formCliente.id}`, {
          nombre: nombreLimpio,
          cuit: cuitLimpio || null,
          telefono: telefonoLimpio || null,
        });
      } else {
        const resCli = await api.post("/clientes", {
          nombre: nombreLimpio,
          cuit: cuitLimpio || null,
          telefono: telefonoLimpio || null,
        });
        clienteIdDestino = resCli.data?.id;
      }

      for (const cmp of formCampos) {
        const nombreCamp = cmp.nombre.trim();
        if (!nombreCamp) continue;

        const distanciaNum =
          cmp.distancia === "" ? null : Number(cmp.distancia);

        const resCamp = await api.post("/campos", {
          cliente_id: clienteIdDestino,
          nombre: nombreCamp,
          distancia: distanciaNum,
        });
        const campoIdDestino = resCamp.data?.id;

        if (
          campoIdDestino &&
          cmp.rutaMapa &&
          distanciaNum !== null &&
          Number(cmp.rutaMapa.km) === distanciaNum
        ) {
          guardarRutaCampoLocal(campoIdDestino, cmp.rutaMapa);
        }

        for (const mol of cmp.molinos || []) {
          const nombreMol = mol.nombre.trim();
          if (!nombreMol || !campoIdDestino) continue;

          await api.post("/molinos", {
            campo_id: campoIdDestino,
            nombre: nombreMol,
            maquina: mol.maquina,
            cilindro: mol.cilindro,
          });
        }
      }

      setModalAbierto(false);
      await cargarDatos();
      mostrarAviso(
        modoEdicion ? "Cliente actualizado" : "Cliente creado",
        modoEdicion
          ? `Los datos de "${nombreLimpio}" se guardaron correctamente.`
          : `"${nombreLimpio}" ya figura en la lista de clientes.`,
      );
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      const msg =
        error.response?.data?.error || "Ocurrió un error al guardar los datos.";
      setErrorFormCliente(msg);
      mostrarAviso("No se pudo guardar", msg, "error");
    }
  };

  const abrirModalEdicionCampo = (cmp) => {
    setCampoEditando(cmp);
    setErrorFormCampo("");
    setFormCampoIndividual({
      nombre: cmp.nombre || "",
      distancia: cmp.distancia ?? "",
      rutaMapa: rutasCampos[String(cmp.id)] || null,
    });
    const molsDelCampo = molinos
      .filter((m) => Number(m.campo_id) === Number(cmp.id))
      .map((m) => ({
        id: m.id,
        campo_id: m.campo_id,
        nombre: m.nombre || "",
        maquina: m.maquina || OPCIONES_MAQUINA[0],
        cilindro: m.cilindro || OPCIONES_CILINDRO[0],
      }));
    setMolinosEditablesCampo(molsDelCampo);
    setNuevoMolino(molinoVacio());
    setModalCampoAbierto(true);
  };

  const agregarMolinoEnCampoExistente = async () => {
    if (!campoEditando) return;
    setErrorFormCampo("");

    const nombreMol = nuevoMolino.nombre.trim();
    if (!nombreMol) {
      const msg = "Ingresá el nombre del molino antes de agregarlo.";
      setErrorFormCampo(msg);
      mostrarAviso("Falta el nombre", msg, "error");
      return;
    }

    const msgRep = validarMolinoRepetido(
      campoEditando.id,
      nombreMol,
      null,
      molinosEditablesCampo,
    );
    if (msgRep) {
      setErrorFormCampo(msgRep);
      mostrarAviso("Molino repetido", msgRep, "error");
      return;
    }

    try {
      const res = await api.post("/molinos", {
        campo_id: campoEditando.id,
        nombre: nombreMol,
        maquina: nuevoMolino.maquina,
        cilindro: nuevoMolino.cilindro,
      });
      if (res.data) {
        setMolinosEditablesCampo((prev) => [...prev, res.data]);
      }
      setNuevoMolino(molinoVacio());
      await cargarDatos();
      mostrarAviso(
        "Molino agregado",
        `Se agregó "${nombreMol}" al campo "${campoEditando.nombre}".`,
      );
    } catch (error) {
      console.error("Error al agregar molino:", error);
      const msg =
        error.response?.data?.error || "No se pudo agregar el molino.";
      setErrorFormCampo(msg);
      mostrarAviso("No se pudo agregar", msg, "error");
    }
  };

  const guardarCampoYMolinos = async (e) => {
    e.preventDefault();
    if (!campoEditando || !clienteSeleccionado) return;
    setErrorFormCampo("");

    const nombreCamp = formCampoIndividual.nombre.trim();
    if (!nombreCamp) {
      setErrorFormCampo("El nombre del campo es obligatorio.");
      return;
    }

    const msgRep = validarCampoRepetido(
      clienteSeleccionado.id,
      nombreCamp,
      campoEditando.id,
    );
    if (msgRep) {
      setErrorFormCampo(msgRep);
      mostrarAviso("Campo repetido", msgRep, "error");
      return;
    }

    for (const mol of molinosEditablesCampo) {
      const nombreMol = mol.nombre.trim();
      if (!nombreMol) {
        const msg = "Todos los molinos del campo deben tener nombre.";
        setErrorFormCampo(msg);
        mostrarAviso("Falta nombre de molino", msg, "error");
        return;
      }
      const msgMolRep = validarMolinoRepetido(
        campoEditando.id,
        nombreMol,
        mol.id,
        molinosEditablesCampo,
      );
      if (msgMolRep) {
        setErrorFormCampo(msgMolRep);
        mostrarAviso("Molino repetido", msgMolRep, "error");
        return;
      }
    }

    try {
      const distanciaNum =
        formCampoIndividual.distancia === ""
          ? null
          : Number(formCampoIndividual.distancia);

      await api.put(`/campos/${campoEditando.id}`, {
        cliente_id: clienteSeleccionado.id,
        nombre: nombreCamp,
        distancia: distanciaNum,
      });

      if (
        formCampoIndividual.rutaMapa &&
        distanciaNum !== null &&
        Number(formCampoIndividual.rutaMapa.km) === distanciaNum
      ) {
        guardarRutaCampoLocal(campoEditando.id, formCampoIndividual.rutaMapa);
      }

      for (const mol of molinosEditablesCampo) {
        await api.put(`/molinos/${mol.id}`, {
          campo_id: campoEditando.id,
          nombre: mol.nombre.trim(),
          maquina: mol.maquina,
          cilindro: mol.cilindro,
        });
      }

      setModalCampoAbierto(false);
      await cargarDatos();
      mostrarAviso(
        "Cambios guardados",
        `El campo "${nombreCamp}" y sus molinos fueron actualizados.`,
      );
    } catch (error) {
      console.error("Error al actualizar campo y molinos:", error);
      const msg =
        error.response?.data?.error || "Error al actualizar el campo.";
      setErrorFormCampo(msg);
      mostrarAviso("No se pudo guardar", msg, "error");
    }
  };

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
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#475569",
                    marginTop: "2px",
                  }}
                >
                  {t.mensaje}
                </div>
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}

      {/* Buscador del mismo ancho que la lista de clientes + Nuevo Cliente */}
      <div style={styles.searchBarContainer}>
        <input
          type="text"
          placeholder="Buscar cliente por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={styles.input}
        />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={abrirModalNuevo}
            style={styles.btnSuccess}
          >
            + Nuevo Cliente
          </button>
        </div>
      </div>

      <div style={styles.panelGrid}>
        <div style={styles.cardLeft}>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <table style={styles.table}>
              <tbody>
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      No se encontraron clientes.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cli) => {
                    const seleccionado =
                      Number(clienteSeleccionado?.id) === Number(cli.id);

                    return (
                      <tr
                        key={cli.id}
                        onClick={() => setClienteSeleccionado(cli)}
                        style={{
                          cursor: "pointer",
                          backgroundColor: seleccionado
                            ? "#e0f2fe"
                            : "transparent",
                        }}
                      >
                        <td style={{ ...styles.td, fontWeight: "600" }}>
                          {cli.nombre}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.cardRight}>
          {clienteSeleccionado ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.3rem",
                        color: "#0f172a",
                        margin: 0,
                      }}
                    >
                      {clienteSeleccionado.nombre}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        abrirModalEdicionCliente(clienteSeleccionado)
                      }
                      style={styles.btnEditarDiscreto}
                      title="Modificar datos del cliente o agregar campos y molinos"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                      }}
                    >
                      <IconoLapiz size={14} />
                      <span>Editar</span>
                    </button>
                  </div>

                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "#475569",
                      margin: "6px 0 0",
                    }}
                  >
                    CUIT: {clienteSeleccionado.cuit || "-"} · Teléfono:{" "}
                    {clienteSeleccionado.telefono || "-"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={abrirModalDetalle}
                  style={styles.btnVerDetalle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(15, 118, 110, 0.22)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(15, 118, 110, 0.14)";
                  }}
                >
                  <IconoDetalle />
                  <span>Ver detalle</span>
                </button>
              </div>

              {camposDelCliente.length === 0 ? (
                <p
                  style={{
                    fontSize: "0.92rem",
                    color: "#64748b",
                    fontStyle: "italic",
                  }}
                >
                  Este cliente no tiene campos cargados.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "12px",
                    width: "100%",
                  }}
                >
                  {camposDelCliente.map((cmp, idx) => {
                    const molinosCampo = molinos.filter(
                      (m) => Number(m.campo_id) === Number(cmp.id),
                    );
                    const tema = styles.campoRuralCard(idx);
                    const tieneMapa = Boolean(
                      rutasCampos[String(cmp.id)]?.destino,
                    );

                    return (
                      <div
                        key={cmp.id}
                        style={{
                          minWidth: 0,
                          border: tema.border,
                          borderRadius: tema.borderRadius,
                          backgroundColor: tema.backgroundColor,
                          overflow: "hidden",
                          boxShadow: tema.boxShadow,
                          color: tema.color,
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: tema.headerBg,
                            padding: "10px 12px",
                            borderBottom: `1px solid ${tema.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "6px",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  color: "#576553",
                                }}
                              >
                                Campo
                              </div>
                              <div
                                style={{
                                  fontWeight: "800",
                                  fontSize: "1rem",
                                  color: "#1c281a",
                                  marginTop: "1px",
                                  wordBreak: "break-word",
                                }}
                              >
                                {cmp.nombre}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => abrirModalEdicionCampo(cmp)}
                              style={styles.btnEditarDiscreto}
                              title="Editar campo y molinos"
                            >
                              <IconoLapiz size={12} />
                              <span>Editar</span>
                            </button>
                          </div>

                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#43523f",
                              marginTop: "6px",
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "6px",
                              flexWrap: "nowrap",
                            }}
                          >
                            <span style={{ whiteSpace: "nowrap" }}>
                              Distancia:{" "}
                              {cmp.distancia != null && cmp.distancia !== ""
                                ? `${cmp.distancia} km`
                                : "Sin dato"}
                            </span>

                            {tieneMapa && (
                              <button
                                type="button"
                                onClick={() => abrirVerRecorridoCampo(cmp)}
                                style={styles.btnVerMapaCampo}
                                title="Ver recorrido marcado en el mapa"
                              >
                                <IconoMapa size={12} />
                                <span>Ver</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "10px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "7px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.76rem",
                              fontWeight: "700",
                              color: "#3f4d3b",
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                            }}
                          >
                            Molinos ({molinosCampo.length})
                          </div>

                          {molinosCampo.length === 0 ? (
                            <span
                              style={{
                                fontSize: "0.84rem",
                                color: "#64748b",
                                fontStyle: "italic",
                              }}
                            >
                              Sin molinos cargados.
                            </span>
                          ) : (
                            molinosCampo.map((mol) => (
                              <div
                                key={mol.id}
                                style={{
                                  backgroundColor: "rgba(255, 255, 255, 0.82)",
                                  border: "1px solid rgba(63, 77, 59, 0.16)",
                                  borderRadius: "7px",
                                  padding: "8px 10px",
                                  fontSize: "0.86rem",
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "700",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {mol.nombre}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "#475569",
                                    marginTop: "2px",
                                  }}
                                >
                                  {mol.maquina} · {mol.cilindro}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                minHeight: "400px",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontWeight: "500",
                fontSize: "0.96rem",
              }}
            >
              Seleccioná un cliente de la lista para ver sus campos y molinos.
            </div>
          )}
        </div>
      </div>

      {/* Modal Detalle del Cliente */}
      {modalDetalleAbierto &&
        clienteSeleccionado &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setModalDetalleAbierto(false)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              {/* Título con deuda total independiente del filtro */}
              <div style={{ marginBottom: "14px", paddingRight: "42px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.35rem",
                      color: "#0f172a",
                    }}
                  >
                    {clienteSeleccionado.nombre}
                  </h3>

                  {deudaTotalCliente > 0 ? (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: "800",
                        backgroundColor: "#fef2f2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5",
                      }}
                    >
                      Tiene deuda · Pendiente:{" "}
                      {formatearMoneda(deudaTotalCliente)}
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: "800",
                        backgroundColor: "#f0fdf4",
                        color: "#15803d",
                        border: "1px solid #86efac",
                      }}
                    >
                      Está al día
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.88rem",
                    color: "#64748b",
                  }}
                >
                  CUIT: {clienteSeleccionado.cuit || "-"} · Teléfono:{" "}
                  {clienteSeleccionado.telefono || "-"}
                </p>
              </div>

              {/* Filtros de tiempo arriba con el input a la derecha */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  marginBottom: "18px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setTipoFiltroTiempo("todo")}
                  style={styles.filtroChip(tipoFiltroTiempo === "todo")}
                >
                  Todo
                </button>
                <button
                  type="button"
                  onClick={() => setTipoFiltroTiempo("dia")}
                  style={styles.filtroChip(tipoFiltroTiempo === "dia")}
                >
                  Por día
                </button>
                <button
                  type="button"
                  onClick={() => setTipoFiltroTiempo("rango")}
                  style={styles.filtroChip(tipoFiltroTiempo === "rango")}
                >
                  Por rango de fecha
                </button>
                <button
                  type="button"
                  onClick={() => setTipoFiltroTiempo("mes")}
                  style={styles.filtroChip(tipoFiltroTiempo === "mes")}
                >
                  Por mes
                </button>
                <button
                  type="button"
                  onClick={() => setTipoFiltroTiempo("anio")}
                  style={styles.filtroChip(tipoFiltroTiempo === "anio")}
                >
                  Por año
                </button>

                {tipoFiltroTiempo === "dia" && (
                  <input
                    type="date"
                    value={fechaDia}
                    onChange={(e) => setFechaDia(e.target.value)}
                    style={styles.inputFiltroInline}
                  />
                )}

                {tipoFiltroTiempo === "rango" && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      style={styles.inputFiltroInline}
                    />
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      a
                    </span>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      style={styles.inputFiltroInline}
                    />
                  </div>
                )}

                {tipoFiltroTiempo === "mes" && (
                  <input
                    type="month"
                    value={mesFiltro}
                    onChange={(e) => setMesFiltro(e.target.value)}
                    style={styles.inputFiltroInline}
                  />
                )}

                {tipoFiltroTiempo === "anio" && (
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    placeholder="Ej: 2026"
                    value={anioFiltro}
                    onChange={(e) => setAnioFiltro(e.target.value)}
                    style={{ ...styles.inputFiltroInline, width: "105px" }}
                  />
                )}
              </div>

              {/* Tabla de Trabajos */}
              <div style={{ marginBottom: "22px" }}>
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: "1rem",
                    fontWeight: "800",
                    color: "#0f172a",
                  }}
                >
                  Trabajos ({datosDetalle.trabajosAgrupados.length})
                </h4>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "560px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={styles.detalleTh}>Fecha</th>
                        <th style={styles.detalleTh}>Campo / Molinos</th>
                        <th style={styles.detalleTh}>Descripción</th>
                        <th style={{ ...styles.detalleTh, textAlign: "right" }}>
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosDetalle.trabajosAgrupados.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              ...styles.detalleTd,
                              textAlign: "center",
                              color: "#64748b",
                              padding: "16px",
                            }}
                          >
                            No hay trabajos registrados para el filtro
                            seleccionado.
                          </td>
                        </tr>
                      ) : (
                        datosDetalle.trabajosAgrupados.map((tr) => (
                          <tr key={tr.key}>
                            <td style={styles.detalleTd}>
                              {formatearFechaAR(tr.fecha)}
                            </td>
                            <td style={styles.detalleTd}>
                              <div style={{ fontWeight: "700" }}>
                                {tr.campoNombre}
                              </div>
                              {tr.molinosTexto && (
                                <div
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "#475569",
                                    marginTop: "2px",
                                  }}
                                >
                                  {tr.molinosTexto}
                                </div>
                              )}
                            </td>
                            <td style={styles.detalleTd}>{tr.descripcion}</td>
                            <td
                              style={{
                                ...styles.detalleTd,
                                textAlign: "right",
                                fontWeight: "700",
                              }}
                            >
                              {formatearMoneda(tr.montoNum)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: "#f1f5f9" }}>
                        <td
                          colSpan={3}
                          style={{
                            ...styles.detalleTd,
                            fontWeight: "800",
                            borderBottom: "none",
                          }}
                        >
                          Total Montos Trabajos
                        </td>
                        <td
                          style={{
                            ...styles.detalleTd,
                            textAlign: "right",
                            fontWeight: "800",
                            color: "#0f172a",
                            borderBottom: "none",
                          }}
                        >
                          {formatearMoneda(datosDetalle.totalTrabajos)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tabla de Pagos */}
              <div>
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: "1rem",
                    fontWeight: "800",
                    color: "#0f172a",
                  }}
                >
                  Pagos ({datosDetalle.pagosFiltrados.length})
                </h4>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "560px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={styles.detalleTh}>Fecha</th>
                        <th style={styles.detalleTh}>Tipo de Pago</th>
                        <th style={styles.detalleTh}>Observación</th>
                        <th style={{ ...styles.detalleTh, textAlign: "right" }}>
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosDetalle.pagosFiltrados.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              ...styles.detalleTd,
                              textAlign: "center",
                              color: "#64748b",
                              padding: "16px",
                            }}
                          >
                            No hay pagos registrados para el filtro
                            seleccionado.
                          </td>
                        </tr>
                      ) : (
                        datosDetalle.pagosFiltrados.map((pg) => (
                          <tr key={pg.id}>
                            <td style={styles.detalleTd}>
                              {formatearFechaAR(pg.fecha)}
                            </td>
                            <td style={styles.detalleTd}>{pg.tipoPagoTexto}</td>
                            <td style={styles.detalleTd}>
                              {pg.observacion || "-"}
                            </td>
                            <td
                              style={{
                                ...styles.detalleTd,
                                textAlign: "right",
                                fontWeight: "700",
                                color: "#15803d",
                              }}
                            >
                              {formatearMoneda(pg.montoNum)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: "#f1f5f9" }}>
                        <td
                          colSpan={3}
                          style={{
                            ...styles.detalleTd,
                            fontWeight: "800",
                            borderBottom: "none",
                          }}
                        >
                          Total Montos Pagos
                        </td>
                        <td
                          style={{
                            ...styles.detalleTd,
                            textAlign: "right",
                            fontWeight: "800",
                            color: "#15803d",
                            borderBottom: "none",
                          }}
                        >
                          {formatearMoneda(datosDetalle.totalPagos)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "18px",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "14px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalDetalleAbierto(false)}
                  style={styles.btnSecondary}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Principal: Nuevo / Editar Cliente con Campos y Molinos */}
      {modalAbierto &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              <h3
                style={{
                  margin: "0 0 18px",
                  fontSize: "1.35rem",
                  color: "#0f172a",
                }}
              >
                {modoEdicion
                  ? "Modificar Cliente y Agregar Campos / Molinos"
                  : "Nuevo Cliente, Campos y Molinos"}
              </h3>

              {errorFormCliente && (
                <div style={styles.alertaInline}>{errorFormCliente}</div>
              )}

              <form onSubmit={guardarClienteCamposYMolinos}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={styles.label}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    value={formCliente.nombre}
                    onChange={(e) =>
                      setFormCliente({ ...formCliente, nombre: e.target.value })
                    }
                    style={styles.input}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                    marginBottom: "18px",
                  }}
                >
                  <div>
                    <label style={styles.label}>CUIT</label>
                    <input
                      type="text"
                      value={formCliente.cuit}
                      onChange={(e) =>
                        setFormCliente({ ...formCliente, cuit: e.target.value })
                      }
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Teléfono</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formCliente.telefono}
                      onChange={(e) =>
                        setFormCliente({
                          ...formCliente,
                          telefono: e.target.value,
                        })
                      }
                      style={styles.input}
                    />
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "16px",
                  }}
                >
                  <h4 style={{ margin: "0 0 12px", fontSize: "1.05rem" }}>
                    {modoEdicion
                      ? "Agregar nuevos campos y molinos"
                      : "Campos y molinos"}
                  </h4>

                  {formCampos.map((cmp, cIdx) => (
                    <div
                      key={cIdx}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        padding: "16px",
                        marginBottom: "14px",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.3fr 1fr",
                          gap: "14px",
                          marginBottom: "14px",
                        }}
                      >
                        <div>
                          <label style={styles.label}>
                            Nombre del Campo{" "}
                            {!modoEdicion && cIdx === 0 ? "*" : ""}
                          </label>
                          <input
                            type="text"
                            required={!modoEdicion && cIdx === 0}
                            placeholder="Ej: Cuadro Norte"
                            value={cmp.nombre}
                            onChange={(e) => {
                              const copia = [...formCampos];
                              copia[cIdx] = {
                                ...copia[cIdx],
                                nombre: e.target.value,
                              };
                              setFormCampos(copia);
                            }}
                            style={styles.input}
                          />
                        </div>

                        <div>
                          <label style={styles.label}>Distancia (km)</label>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="Ej: 18.5"
                              value={cmp.distancia}
                              onChange={(e) => {
                                const copia = [...formCampos];
                                copia[cIdx] = {
                                  ...copia[cIdx],
                                  distancia: e.target.value,
                                  rutaMapa: null,
                                };
                                setFormCampos(copia);
                              }}
                              style={styles.input}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                abrirSelectorMapa((infoRuta) => {
                                  setFormCampos((prev) =>
                                    prev.map((item, idx) =>
                                      idx === cIdx
                                        ? {
                                            ...item,
                                            distancia: String(infoRuta.km),
                                            rutaMapa: infoRuta,
                                          }
                                        : item,
                                    ),
                                  );
                                })
                              }
                              style={styles.btnMapa}
                              title="Elegir punto en el mapa"
                            >
                              <IconoMapa />
                              <span>Mapa</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <span style={styles.label}>Molinos del campo</span>

                        {cmp.molinos.map((mol, mIdx) => (
                          <div
                            key={mIdx}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.4fr 1fr 1fr",
                              gap: "8px",
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Nombre molino"
                              value={mol.nombre}
                              onChange={(e) => {
                                const copia = [...formCampos];
                                const mols = [...copia[cIdx].molinos];
                                mols[mIdx] = {
                                  ...mols[mIdx],
                                  nombre: e.target.value,
                                };
                                copia[cIdx] = { ...copia[cIdx], molinos: mols };
                                setFormCampos(copia);
                              }}
                              style={styles.input}
                            />

                            <select
                              value={mol.maquina}
                              onChange={(e) => {
                                const copia = [...formCampos];
                                const mols = [...copia[cIdx].molinos];
                                mols[mIdx] = {
                                  ...mols[mIdx],
                                  maquina: e.target.value,
                                };
                                copia[cIdx] = { ...copia[cIdx], molinos: mols };
                                setFormCampos(copia);
                              }}
                              style={styles.select}
                            >
                              {OPCIONES_MAQUINA.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>

                            <select
                              value={mol.cilindro}
                              onChange={(e) => {
                                const copia = [...formCampos];
                                const mols = [...copia[cIdx].molinos];
                                mols[mIdx] = {
                                  ...mols[mIdx],
                                  cilindro: e.target.value,
                                };
                                copia[cIdx] = { ...copia[cIdx], molinos: mols };
                                setFormCampos(copia);
                              }}
                              style={styles.select}
                            >
                              {OPCIONES_CILINDRO.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => agregarMolinoEnFormulario(cIdx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            cursor: "pointer",
                            fontWeight: "700",
                            fontSize: "0.9rem",
                            alignSelf: "flex-start",
                            padding: "4px 0",
                          }}
                        >
                          + Agregar molino a este campo
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={agregarCampoEnFormulario}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "0.94rem",
                    }}
                  >
                    + Agregar otro campo
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "20px",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    style={styles.btnSecondary}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnSuccess}>
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Modificar Campo y Molinos */}
      {modalCampoAbierto &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setModalCampoAbierto(false)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              <h3 style={{ margin: "0 0 18px", fontSize: "1.35rem" }}>
                Modificar Campo y Molinos
              </h3>

              {errorFormCampo && (
                <div style={styles.alertaInline}>{errorFormCampo}</div>
              )}

              <form onSubmit={guardarCampoYMolinos}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr 1fr",
                    gap: "14px",
                    marginBottom: "18px",
                  }}
                >
                  <div>
                    <label style={styles.label}>Nombre del Campo *</label>
                    <input
                      type="text"
                      required
                      value={formCampoIndividual.nombre}
                      onChange={(e) =>
                        setFormCampoIndividual({
                          ...formCampoIndividual,
                          nombre: e.target.value,
                        })
                      }
                      style={styles.input}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Distancia (km)</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="number"
                        step="0.1"
                        value={formCampoIndividual.distancia}
                        onChange={(e) =>
                          setFormCampoIndividual({
                            ...formCampoIndividual,
                            distancia: e.target.value,
                            rutaMapa: null,
                          })
                        }
                        style={styles.input}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          abrirSelectorMapa((infoRuta) => {
                            setFormCampoIndividual((prev) => ({
                              ...prev,
                              distancia: String(infoRuta.km),
                              rutaMapa: infoRuta,
                            }));
                          })
                        }
                        style={styles.btnMapa}
                        title="Elegir punto en el mapa"
                      >
                        <IconoMapa />
                        <span>Mapa</span>
                      </button>
                    </div>
                  </div>
                </div>

                {molinosEditablesCampo.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid #e2e8f0",
                      paddingTop: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={styles.label}>Molinos del campo</div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {molinosEditablesCampo.map((mol, idx) => (
                        <div
                          key={mol.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.4fr 1fr 1fr",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="text"
                            value={mol.nombre}
                            onChange={(e) => {
                              const copia = [...molinosEditablesCampo];
                              copia[idx] = {
                                ...copia[idx],
                                nombre: e.target.value,
                              };
                              setMolinosEditablesCampo(copia);
                            }}
                            style={styles.input}
                          />
                          <select
                            value={mol.maquina}
                            onChange={(e) => {
                              const copia = [...molinosEditablesCampo];
                              copia[idx] = {
                                ...copia[idx],
                                maquina: e.target.value,
                              };
                              setMolinosEditablesCampo(copia);
                            }}
                            style={styles.select}
                          >
                            {OPCIONES_MAQUINA.map((op) => (
                              <option key={op} value={op}>
                                {op}
                              </option>
                            ))}
                          </select>
                          <select
                            value={mol.cilindro}
                            onChange={(e) => {
                              const copia = [...molinosEditablesCampo];
                              copia[idx] = {
                                ...copia[idx],
                                cilindro: e.target.value,
                              };
                              setMolinosEditablesCampo(copia);
                            }}
                            style={styles.select}
                          >
                            {OPCIONES_CILINDRO.map((op) => (
                              <option key={op} value={op}>
                                {op}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "14px",
                    marginBottom: "18px",
                  }}
                >
                  <div style={styles.label}>
                    Agregar nuevo molino a este campo
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr 1fr auto",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Nombre del molino"
                      value={nuevoMolino.nombre}
                      onChange={(e) =>
                        setNuevoMolino({
                          ...nuevoMolino,
                          nombre: e.target.value,
                        })
                      }
                      style={styles.input}
                    />
                    <select
                      value={nuevoMolino.maquina}
                      onChange={(e) =>
                        setNuevoMolino({
                          ...nuevoMolino,
                          maquina: e.target.value,
                        })
                      }
                      style={styles.select}
                    >
                      {OPCIONES_MAQUINA.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <select
                      value={nuevoMolino.cilindro}
                      onChange={(e) =>
                        setNuevoMolino({
                          ...nuevoMolino,
                          cilindro: e.target.value,
                        })
                      }
                      style={styles.select}
                    >
                      {OPCIONES_CILINDRO.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={agregarMolinoEnCampoExistente}
                      style={styles.btnPrimary}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalCampoAbierto(false)}
                    style={styles.btnSecondary}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnSuccess}>
                    Guardar Campo
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal del Mapa (Seleccionar o Ver Recorrido) */}
      {modalMapaAbierto &&
        createPortal(
          <div style={{ ...styles.modalOverlay, zIndex: 3000 }}>
            <div
              style={{
                ...styles.modalCard,
                maxWidth: "1200px",
                width: "94vw",
                height: "92vh",
                maxHeight: "92vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <button
                type="button"
                onClick={() => setModalMapaAbierto(false)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              <h3 style={{ margin: "0 0 6px", fontSize: "1.35rem" }}>
                {modoMapa === "ver"
                  ? `Recorrido marcado — ${rutaVisualizacion?.titulo || "Campo"}`
                  : "Calcular distancia por camino en el mapa"}
              </h3>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "0.92rem",
                  color: "#475569",
                }}
              >
                {modoMapa === "ver" ? (
                  <>
                    Origen: <strong>{PUNTO_REFERENCIA.etiqueta}</strong> ·
                    Distancia: <strong>{rutaVisualizacion?.km} km</strong>
                  </>
                ) : (
                  <>
                    Hacé clic en el campo en el mapa para trazar el camino por
                    calles, rutas y caminos rurales desde{" "}
                    <strong>{PUNTO_REFERENCIA.etiqueta}</strong>.
                  </>
                )}
              </p>

              <div
                ref={mapContainerRef}
                style={{
                  width: "100%",
                  flex: 1,
                  minHeight: "340px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  marginBottom: "14px",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {modoMapa === "ver" ? (
                  <div style={{ fontSize: "0.95rem", color: "#334155" }}>
                    Recorrido guardado desde{" "}
                    <strong>{PUNTO_REFERENCIA.etiqueta}</strong>.
                  </div>
                ) : (
                  <div style={{ fontSize: "0.98rem", color: "#0f172a" }}>
                    {calculandoRuta ? (
                      <span style={{ color: "#2563eb", fontWeight: "600" }}>
                        Calculando recorrido por caminos...
                      </span>
                    ) : distanciaCalculadaMapa != null ? (
                      <>
                        Distancia {esRutaPorCamino ? "por camino" : "estimada"}:{" "}
                        <strong style={{ fontSize: "1.08rem" }}>
                          {distanciaCalculadaMapa} km
                        </strong>{" "}
                        <span style={{ color: "#64748b", fontSize: "0.84rem" }}>
                          ({destinoMapa?.lat.toFixed(4)},{" "}
                          {destinoMapa?.lng.toFixed(4)})
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#64748b" }}>
                        Tocá un punto en el mapa para calcular los kilómetros
                        del recorrido.
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setModalMapaAbierto(false)}
                    style={styles.btnSecondary}
                  >
                    {modoMapa === "ver" ? "Cerrar" : "Cancelar"}
                  </button>

                  {modoMapa === "seleccionar" && (
                    <button
                      type="button"
                      disabled={
                        distanciaCalculadaMapa == null || calculandoRuta
                      }
                      onClick={confirmarDistanciaMapa}
                      style={{
                        ...styles.btnSuccess,
                        opacity:
                          distanciaCalculadaMapa == null || calculandoRuta
                            ? 0.5
                            : 1,
                      }}
                    >
                      Usar {distanciaCalculadaMapa ?? ""} km
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
