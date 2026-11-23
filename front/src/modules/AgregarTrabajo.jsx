import { useState, useEffect, useMemo, useCallback } from "react";
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

const TIPOS_PAGO_RESPALDO = [
  { id: 1, nombre: "Efectivo" },
  { id: 2, nombre: "Transferencia" },
  { id: 3, nombre: "Cheque" },
];

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatearMoneda(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}

function formatearMontoVistaPrevia(valor) {
  if (valor === "" || valor === null || valor === undefined) return "$ 0";
  const num = Number(valor);
  if (Number.isNaN(num)) return "$ 0";
  const parteEntera = Math.trunc(Math.abs(num))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const signo = num < 0 ? "-" : "";
  return `${signo}$ ${parteEntera}`;
}

function formatearFechaCorta(isoStr) {
  if (!isoStr) return "—";
  const [y, m, d] = String(isoStr).slice(0, 10).split("-");
  if (!y || !m || !d) return String(isoStr);
  return `${d}/${m}/${y}`;
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

const styles = {
  container: {
    padding: "6px 4px",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px 20px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
    maxWidth: "1060px",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  rowAlineada: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
    alignItems: "stretch",
    marginBottom: "14px",
  },
  colBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px 14px",
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  colHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  section: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
    backgroundColor: "#f8fafc",
    marginBottom: "14px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: "800",
    color: "#0f172a",
  },
  montoGrandePreview: {
    fontSize: "1.45rem",
    fontWeight: "900",
    color: "#15803d",
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
  },
  label: {
    display: "block",
    fontSize: "0.84rem",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "5px",
  },
  input: {
    padding: "9px 11px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.93rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
    width: "100%",
  },
  select: {
    padding: "9px 11px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.93rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
    width: "100%",
  },
  chip: (activo) => ({
    padding: "6px 10px",
    borderRadius: "7px",
    border: activo ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
    backgroundColor: activo ? "#dbeafe" : "#ffffff",
    color: activo ? "#1e3a8a" : "#334155",
    fontWeight: activo ? "700" : "600",
    fontSize: "0.84rem",
    cursor: "pointer",
    transition: "all 0.14s ease",
  }),
  btnMiniColor: (bg) => ({
    padding: "5px 9px",
    backgroundColor: bg,
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.78rem",
    whiteSpace: "nowrap",
    lineHeight: 1.2,
  }),
  btnSuccess: {
    padding: "11px 22px",
    background: "linear-gradient(135deg, #2e6f40 0%, #1d4d2b 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "700",
    boxShadow: "0 4px 12px rgba(46, 111, 64, 0.3)",
  },
  btnSecondary: {
    padding: "10px 16px",
    backgroundColor: "#64748b",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.9rem",
  },
  btnQuitarPago: {
    padding: "7px 10px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
  },
  alertaError: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: "11px 14px",
    borderRadius: "8px",
    fontSize: "0.88rem",
    fontWeight: "600",
    marginBottom: "14px",
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
    padding: "24px 28px",
    borderRadius: "14px",
    maxWidth: "560px",
    width: "92vw",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.4)",
    position: "relative",
    boxSizing: "border-box",
  },
  btnCloseX: {
    position: "absolute",
    top: "16px",
    right: "18px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    width: "34px",
    height: "34px",
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "#334155",
    cursor: "pointer",
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

export default function AgregarTrabajo({ onTrabajoGuardado }) {
  const [clientes, setClientes] = useState([]);
  const [campos, setCampos] = useState([]);
  const [molinos, setMolinos] = useState([]);
  const [tiposPago, setTiposPago] = useState(TIPOS_PAGO_RESPALDO);

  const [clienteId, setClienteId] = useState("");
  const [camposSeleccionados, setCamposSeleccionados] = useState([]);
  const [molinosSeleccionados, setMolinosSeleccionados] = useState([]);

  const hoyMin = useMemo(() => hoyISO(), []);

  // Datos del trabajo
  const [fecha, setFecha] = useState(() => hoyISO());
  const [descripcion, setDescripcion] = useState("");
  const [montoTrabajo, setMontoTrabajo] = useState("");

  // Checkbox de cargar pago (habilitado por defecto)
  const [cargarPago, setCargarPago] = useState(true);
  const [pagosLista, setPagosLista] = useState(() => [
    crearPagoVacio(buscarIdEfectivo(TIPOS_PAGO_RESPALDO), hoyISO()),
  ]);

  // Confirmación antes de guardar
  const [confirmacionGuardado, setConfirmacionGuardado] = useState(null);

  // Modal nuevo cliente
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    cuit: "",
    telefono: "",
    campoNombre: "",
    molinoNombre: "",
    maquina: OPCIONES_MAQUINA[0],
    cilindro: OPCIONES_CILINDRO[0],
  });
  const [errorNuevoCliente, setErrorNuevoCliente] = useState("");

  // Modal nuevos campos
  const [modalNuevosCampos, setModalNuevosCampos] = useState(false);
  const [nombresNuevosCampos, setNombresNuevosCampos] = useState([""]);
  const [errorNuevosCampos, setErrorNuevosCampos] = useState("");

  // Modal nuevos molinos
  const [modalNuevosMolinos, setModalNuevosMolinos] = useState(false);
  const [listaNuevosMolinos, setListaNuevosMolinos] = useState([]);
  const [errorNuevosMolinos, setErrorNuevosMolinos] = useState("");

  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [toasts, setToasts] = useState([]);

  const mostrarAviso = useCallback((titulo, mensaje, tipo = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, titulo, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const cargarDatosIniciales = useCallback(async () => {
    try {
      const [resCli, resCam, resMol, resTipos] = await Promise.all([
        api.get("/clientes"),
        api.get("/campos"),
        api.get("/molinos"),
        api.get("/tipos_pago").catch(() => ({ data: [] })),
      ]);

      setClientes(Array.isArray(resCli.data) ? resCli.data : []);
      setCampos(Array.isArray(resCam.data) ? resCam.data : []);
      setMolinos(Array.isArray(resMol.data) ? resMol.data : []);

      const listaNormalizada = normalizarTiposPago(resTipos.data);
      setTiposPago(listaNormalizada);

      const idEfectivo = buscarIdEfectivo(listaNormalizada);
      setPagosLista((prev) =>
        prev.map((p, idx) => {
          const existeTipo = listaNormalizada.some(
            (tp) => String(tp.id) === String(p.tipo_pago_id),
          );
          if (existeTipo) return p;
          return {
            ...p,
            tipo_pago_id:
              idx === 0 ? idEfectivo : String(listaNormalizada[0].id),
          };
        }),
      );
    } catch (err) {
      console.error("Error cargando datos en AgregarTrabajo:", err);
      setTiposPago(TIPOS_PAGO_RESPALDO);
      mostrarAviso(
        "Error de conexión",
        "No se pudieron cargar los datos iniciales.",
        "error",
      );
    }
  }, [mostrarAviso]);

  useEffect(() => {
    cargarDatosIniciales();
  }, [cargarDatosIniciales]);

  const camposDisponibles = useMemo(() => {
    if (!clienteId) return [];
    return campos.filter((c) => Number(c.cliente_id) === Number(clienteId));
  }, [campos, clienteId]);

  const molinosDisponibles = useMemo(() => {
    if (camposSeleccionados.length === 0) return [];
    const setCampos = new Set(camposSeleccionados.map(Number));
    return molinos.filter((m) => setCampos.has(Number(m.campo_id)));
  }, [molinos, camposSeleccionados]);

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
      Number(
        pagosLista.reduce((acc, p) => acc + Number(p.monto || 0), 0).toFixed(2),
      ),
    [pagosLista],
  );

  const handleChangeCliente = (nuevoId) => {
    setClienteId(nuevoId);
    setCamposSeleccionados([]);
    setMolinosSeleccionados([]);
  };

  const toggleCampo = (idCampo) => {
    const numId = Number(idCampo);
    setCamposSeleccionados((prev) => {
      const existe = prev.includes(numId);
      const siguiente = existe
        ? prev.filter((id) => id !== numId)
        : [...prev, numId];

      const molinosValidosIds = new Set(
        molinos
          .filter((m) => siguiente.includes(Number(m.campo_id)))
          .map((m) => Number(m.id)),
      );
      setMolinosSeleccionados((mPrev) =>
        mPrev.filter((mId) => molinosValidosIds.has(Number(mId))),
      );

      return siguiente;
    });
  };

  const toggleMolino = (idMolino) => {
    const numId = Number(idMolino);
    setMolinosSeleccionados((prev) =>
      prev.includes(numId)
        ? prev.filter((id) => id !== numId)
        : [...prev, numId],
    );
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

  const validarClienteExistente = (nombre, cuit) => {
    const nombreNorm = String(nombre || "")
      .trim()
      .toLowerCase();
    const cuitNorm = String(cuit || "")
      .trim()
      .toLowerCase();

    const mismoNombre = clientes.some(
      (c) =>
        String(c.nombre || "")
          .trim()
          .toLowerCase() === nombreNorm,
    );
    if (mismoNombre) {
      return `Ya existe un cliente con el nombre "${nombre.trim()}".`;
    }

    if (cuitNorm) {
      const mismoCuit = clientes.some(
        (c) =>
          String(c.cuit || "")
            .trim()
            .toLowerCase() === cuitNorm,
      );
      if (mismoCuit) {
        return `Ya existe un cliente con el CUIT "${cuit.trim()}".`;
      }
    }

    return "";
  };

  const validarCampoExistenteDeCliente = (cliId, nombreCampo) => {
    const campoNorm = String(nombreCampo || "")
      .trim()
      .toLowerCase();
    if (!campoNorm || !cliId) return "";

    const existe = campos.some(
      (c) =>
        Number(c.cliente_id) === Number(cliId) &&
        String(c.nombre || "")
          .trim()
          .toLowerCase() === campoNorm,
    );
    if (existe) {
      return `El campo "${nombreCampo.trim()}" ya existe para este cliente.`;
    }
    return "";
  };

  const handleGuardarNuevoCliente = async (e) => {
    e.preventDefault();
    setErrorNuevoCliente("");

    const nombreTrim = nuevoCliente.nombre.trim();
    const cuitTrim = nuevoCliente.cuit.trim();
    const telTrim = nuevoCliente.telefono.trim();
    const campoTrim = nuevoCliente.campoNombre.trim();
    const molinoTrim = nuevoCliente.molinoNombre.trim();

    if (!nombreTrim) {
      setErrorNuevoCliente("Ingresá el nombre del cliente.");
      return;
    }
    if (!campoTrim) {
      setErrorNuevoCliente("Ingresá al menos un campo para el cliente.");
      return;
    }
    if (!molinoTrim) {
      setErrorNuevoCliente("Ingresá al menos un molino para el campo.");
      return;
    }

    const msgRep = validarClienteExistente(nombreTrim, cuitTrim);
    if (msgRep) {
      setErrorNuevoCliente(msgRep);
      mostrarAviso("Cliente duplicado", msgRep, "error");
      return;
    }

    try {
      const resCli = await api.post("/clientes", {
        nombre: nombreTrim,
        cuit: cuitTrim || null,
        telefono: telTrim || null,
      });
      const idClienteCreado = resCli.data?.id;

      const resCam = await api.post("/campos", {
        cliente_id: idClienteCreado,
        nombre: campoTrim,
        distancia: null,
      });
      const idCampoCreado = resCam.data?.id;

      let idMolinoCreado = null;
      if (idCampoCreado) {
        const resMol = await api.post("/molinos", {
          campo_id: idCampoCreado,
          nombre: molinoTrim,
          maquina: nuevoCliente.maquina,
          cilindro: nuevoCliente.cilindro,
        });
        idMolinoCreado = resMol.data?.id || null;
      }

      await cargarDatosIniciales();

      if (idClienteCreado) {
        setClienteId(String(idClienteCreado));
        setCamposSeleccionados(idCampoCreado ? [Number(idCampoCreado)] : []);
        setMolinosSeleccionados(idMolinoCreado ? [Number(idMolinoCreado)] : []);
      }

      setModalNuevoCliente(false);
      setNuevoCliente({
        nombre: "",
        cuit: "",
        telefono: "",
        campoNombre: "",
        molinoNombre: "",
        maquina: OPCIONES_MAQUINA[0],
        cilindro: OPCIONES_CILINDRO[0],
      });

      mostrarAviso(
        "Cliente nuevo creado con éxito",
        `Se creó "${nombreTrim}" con su campo "${campoTrim}" y molino "${molinoTrim}".`,
      );
    } catch (err) {
      console.error("Error creando cliente:", err);
      const msg = err.response?.data?.error || "No se pudo crear el cliente.";
      setErrorNuevoCliente(msg);
      mostrarAviso("Error al crear cliente", msg, "error");
    }
  };

  const abrirModalNuevosCampos = () => {
    if (!clienteId) {
      mostrarAviso(
        "Seleccioná un cliente",
        "Primero elegí un cliente para agregarle campos.",
        "error",
      );
      return;
    }
    setErrorNuevosCampos("");
    setNombresNuevosCampos([""]);
    setModalNuevosCampos(true);
  };

  const handleGuardarNuevosCampos = async (e) => {
    e.preventDefault();
    setErrorNuevosCampos("");

    const limpios = nombresNuevosCampos
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (limpios.length === 0) {
      setErrorNuevosCampos("Ingresá al menos un nombre de campo.");
      return;
    }

    const vistos = new Set();
    for (const nombreCamp of limpios) {
      const lower = nombreCamp.toLowerCase();
      if (vistos.has(lower)) {
        const msg = `El campo "${nombreCamp}" está repetido.`;
        setErrorNuevosCampos(msg);
        mostrarAviso("Campo duplicado", msg, "error");
        return;
      }
      vistos.add(lower);

      const msgExiste = validarCampoExistenteDeCliente(clienteId, nombreCamp);
      if (msgExiste) {
        setErrorNuevosCampos(msgExiste);
        mostrarAviso("Campo duplicado", msgExiste, "error");
        return;
      }
    }

    try {
      const idsCreados = [];
      for (const nombreCamp of limpios) {
        const res = await api.post("/campos", {
          cliente_id: Number(clienteId),
          nombre: nombreCamp,
          distancia: null,
        });
        if (res.data?.id) {
          idsCreados.push(Number(res.data.id));
        }
      }

      await cargarDatosIniciales();
      setCamposSeleccionados((prev) =>
        Array.from(new Set([...prev, ...idsCreados])),
      );
      setModalNuevosCampos(false);
      mostrarAviso(
        "Campos creados con éxito",
        `Se ${limpios.length === 1 ? "agregó el campo" : "agregaron los campos"}: ${limpios.join(", ")}.`,
      );
    } catch (err) {
      console.error("Error creando campos:", err);
      const msg =
        err.response?.data?.error || "No se pudieron crear los campos.";
      setErrorNuevosCampos(msg);
      mostrarAviso("Error al crear campos", msg, "error");
    }
  };

  const abrirModalNuevosMolinos = () => {
    if (camposSeleccionados.length === 0) {
      mostrarAviso(
        "Seleccioná un campo",
        "Primero elegí al menos un campo para agregarle molinos.",
        "error",
      );
      return;
    }
    setErrorNuevosMolinos("");
    setListaNuevosMolinos([
      {
        campo_id: String(camposSeleccionados[0]),
        nombre: "",
        maquina: OPCIONES_MAQUINA[0],
        cilindro: OPCIONES_CILINDRO[0],
      },
    ]);
    setModalNuevosMolinos(true);
  };

  const handleGuardarNuevosMolinos = async (e) => {
    e.preventDefault();
    setErrorNuevosMolinos("");

    const validos = listaNuevosMolinos
      .map((m) => ({
        ...m,
        nombreTrim: m.nombre.trim(),
      }))
      .filter((m) => m.nombreTrim.length > 0);

    if (validos.length === 0) {
      setErrorNuevosMolinos("Ingresá el nombre de al menos un molino.");
      return;
    }

    const vistosEnCampo = new Set();
    for (const m of validos) {
      const clave = `${m.campo_id}__${m.nombreTrim.toLowerCase()}`;
      if (vistosEnCampo.has(clave)) {
        const msg = `El molino "${m.nombreTrim}" está repetido en el mismo campo.`;
        setErrorNuevosMolinos(msg);
        mostrarAviso("Molino duplicado", msg, "error");
        return;
      }
      vistosEnCampo.add(clave);

      const yaExisteBD = molinos.some(
        (existente) =>
          Number(existente.campo_id) === Number(m.campo_id) &&
          String(existente.nombre || "")
            .trim()
            .toLowerCase() === m.nombreTrim.toLowerCase(),
      );
      if (yaExisteBD) {
        const msg = `El molino "${m.nombreTrim}" ya existe en ese campo.`;
        setErrorNuevosMolinos(msg);
        mostrarAviso("Molino duplicado", msg, "error");
        return;
      }
    }

    try {
      const idsMolinosCreados = [];
      for (const m of validos) {
        const res = await api.post("/molinos", {
          campo_id: Number(m.campo_id),
          nombre: m.nombreTrim,
          maquina: m.maquina,
          cilindro: m.cilindro,
        });
        if (res.data?.id) {
          idsMolinosCreados.push(Number(res.data.id));
        }
      }

      await cargarDatosIniciales();
      setMolinosSeleccionados((prev) =>
        Array.from(new Set([...prev, ...idsMolinosCreados])),
      );
      setModalNuevosMolinos(false);
      mostrarAviso(
        "Molinos creados con éxito",
        `Se ${validos.length === 1 ? "agregó el molino" : "agregaron los molinos"}: ${validos.map((x) => x.nombreTrim).join(", ")}.`,
      );
    } catch (err) {
      console.error("Error creando molinos:", err);
      const msg =
        err.response?.data?.error || "No se pudieron crear los molinos.";
      setErrorNuevosMolinos(msg);
      mostrarAviso("Error al crear molinos", msg, "error");
    }
  };

  const limpiarFormulario = () => {
    const fechaActual = hoyISO();
    setCamposSeleccionados([]);
    setMolinosSeleccionados([]);
    setFecha(fechaActual);
    setDescripcion("");
    setMontoTrabajo("");
    setCargarPago(true);
    setPagosLista([crearPagoVacio(buscarIdEfectivo(tiposPago), fechaActual)]);
  };

  // Validación previa completa antes de realizar cualquier POST
  const validarTodoAntesDeGuardar = () => {
    const fechaHoy = hoyISO();
    if (!clienteId) {
      return "Seleccioná un cliente o creá uno nuevo.";
    }
    if (camposSeleccionados.length === 0) {
      return "Seleccioná al menos un campo.";
    }
    if (!fecha) {
      return "Indicá la fecha del trabajo.";
    }

    const montoTotalNum = Number(montoTrabajo || 0);
    if (Number.isNaN(montoTotalNum) || montoTotalNum <= 0) {
      return "Ingresá un monto válido mayor a 0 para el trabajo.";
    }

    if (cargarPago) {
      if (!Array.isArray(pagosLista) || pagosLista.length === 0) {
        return "Agregá al menos una forma de pago o destildá 'Cargar pago'.";
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

      if (sumaPagos > montoTotalNum) {
        return `La suma de los pagos (${formatearMoneda(sumaPagos)}) no puede superar el monto del trabajo (${formatearMoneda(montoTotalNum)}).`;
      }
    }

    return "";
  };

  const ejecutarGuardadoConfirmado = async (payloadConfirmado) => {
    const { montoTotalNum, itemsTrabajo, pagosACargar, totalPagosConfirmado } =
      payloadConfirmado;

    setGuardando(true);
    try {
      for (const payloadTrabajo of itemsTrabajo) {
        await api.post("/trabajos", payloadTrabajo);
      }

      if (cargarPago) {
        for (const p of pagosACargar) {
          const montoLinea = Number(p.monto);
          const tipoNum = Number(p.tipo_pago_id);

          const resPago = await api.post("/pagos", {
            cliente_id: Number(clienteId),
            tipo_pago_id: tipoNum,
            fecha,
            monto: montoLinea,
            observacion: p.observacion.trim() || descripcion.trim() || null,
          });

          const pagoIdCreado = resPago.data?.id;

          if (esTipoCheque(p.tipo_pago_id)) {
            await api.post("/cheques", {
              pago_id: pagoIdCreado || null,
              cliente_id: Number(clienteId),
              numero_cheque: p.cheque.numero_cheque.trim(),
              banco: p.cheque.banco.trim(),
              monto: montoLinea,
              fecha_cobro: p.cheque.fecha_cobro || hoyISO(),
              fecha_vencimiento: p.cheque.fecha_cobro || hoyISO(),
              estado: "pendiente",
            });
          }
        }
      }

      const saldoPendiente = cargarPago
        ? Number((montoTotalNum - totalPagosConfirmado).toFixed(2))
        : montoTotalNum;

      limpiarFormulario();

      mostrarAviso(
        "Trabajo guardado con éxito",
        cargarPago
          ? saldoPendiente > 0
            ? `Pagado: ${formatearMoneda(totalPagosConfirmado)} · Pendiente: ${formatearMoneda(saldoPendiente)}.`
            : "El trabajo y los pagos se registraron correctamente."
          : `Trabajo registrado · Pendiente: ${formatearMoneda(saldoPendiente)}.`,
      );

      if (onTrabajoGuardado) {
        onTrabajoGuardado();
      }
    } catch (err) {
      console.error("Error guardando trabajo:", err);
      const msg =
        err.response?.data?.error || "Ocurrió un error al guardar el trabajo.";
      setErrorForm(msg);
      mostrarAviso("No se pudo guardar", msg, "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm("");

    const errorValidacion = validarTodoAntesDeGuardar();
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      mostrarAviso("Revisá los datos", errorValidacion, "error");
      return;
    }

    const montoTotalNum = Number(montoTrabajo);
    const itemsTrabajo = [];

    if (molinosSeleccionados.length > 0) {
      molinosSeleccionados.forEach((mId, idx) => {
        const molObj = molinos.find((m) => Number(m.id) === Number(mId));
        if (molObj) {
          itemsTrabajo.push({
            cliente_id: Number(clienteId),
            campo_id: Number(molObj.campo_id),
            molino_id: Number(molObj.id),
            fecha,
            descripcion: descripcion.trim() || null,
            monto: idx === 0 ? montoTotalNum : 0,
          });
        }
      });
    } else {
      camposSeleccionados.forEach((cId, idx) => {
        itemsTrabajo.push({
          cliente_id: Number(clienteId),
          campo_id: Number(cId),
          molino_id: null,
          fecha,
          descripcion: descripcion.trim() || null,
          monto: idx === 0 ? montoTotalNum : 0,
        });
      });
    }

    const clienteObj = clientes.find((c) => Number(c.id) === Number(clienteId));
    const nombresCampos = camposSeleccionados.map(
      (cId) =>
        campos.find((c) => Number(c.id) === Number(cId))?.nombre ||
        `Campo #${cId}`,
    );
    const nombresMolinos = molinosSeleccionados.map(
      (mId) =>
        molinos.find((m) => Number(m.id) === Number(mId))?.nombre ||
        `Molino #${mId}`,
    );

    const detallePagos = cargarPago
      ? pagosLista.map((p) => {
          const tipoObj = tiposPago.find(
            (tp) => String(tp.id) === String(p.tipo_pago_id),
          );
          const esCheque = esTipoCheque(p.tipo_pago_id);
          return {
            tipoNombre: tipoObj?.nombre || `Tipo #${p.tipo_pago_id}`,
            monto: Number(p.monto || 0),
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
        })
      : [];

    setConfirmacionGuardado({
      clienteNombre: clienteObj?.nombre || `Cliente #${clienteId}`,
      nombresCampos,
      nombresMolinos,
      fecha,
      descripcion: descripcion.trim(),
      montoTotalNum,
      cargarPago,
      detallePagos,
      totalPagosConfirmado: sumaPagos,
      saldoPendiente: cargarPago
        ? Number((montoTotalNum - sumaPagos).toFixed(2))
        : montoTotalNum,
      itemsTrabajo,
      pagosACargar: cargarPago ? pagosLista : [],
    });
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
                <div style={{ fontSize: "0.84rem", color: "#475569" }}>
                  {t.mensaje}
                </div>
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}

      <div style={styles.card}>
        {errorForm && <div style={styles.alertaError}>{errorForm}</div>}

        <form onSubmit={handleSubmit}>
          {/* 1. Cliente, 2. Campos y 3. Molinos alineados en horizontal */}
          <div style={styles.rowAlineada}>
            <div style={styles.colBox}>
              <div style={styles.colHeader}>
                <div style={styles.sectionTitle}>1. Cliente</div>
                <button
                  type="button"
                  onClick={() => {
                    setErrorNuevoCliente("");
                    setModalNuevoCliente(true);
                  }}
                  style={styles.btnMiniColor("#2563eb")}
                >
                  + Nuevo
                </button>
              </div>

              <select
                value={clienteId}
                onChange={(e) => handleChangeCliente(e.target.value)}
                style={styles.select}
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.colBox}>
              <div style={styles.colHeader}>
                <div style={styles.sectionTitle}>
                  2. Campos ({camposSeleccionados.length})
                </div>
                <button
                  type="button"
                  onClick={abrirModalNuevosCampos}
                  style={styles.btnMiniColor("#7c3aed")}
                >
                  + Nuevo
                </button>
              </div>

              {!clienteId ? (
                <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                  Elegí un cliente.
                </span>
              ) : camposDisponibles.length === 0 ? (
                <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                  Sin campos cargados.
                </span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {camposDisponibles.map((cmp) => {
                    const activa = camposSeleccionados.includes(Number(cmp.id));
                    return (
                      <button
                        key={cmp.id}
                        type="button"
                        onClick={() => toggleCampo(cmp.id)}
                        style={styles.chip(activa)}
                      >
                        {activa ? "✓ " : ""}
                        {cmp.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={styles.colBox}>
              <div style={styles.colHeader}>
                <div style={styles.sectionTitle}>
                  3. Molinos ({molinosSeleccionados.length})
                </div>
                <button
                  type="button"
                  onClick={abrirModalNuevosMolinos}
                  style={styles.btnMiniColor("#0d9488")}
                >
                  + Nuevo
                </button>
              </div>

              {camposSeleccionados.length === 0 ? (
                <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                  Seleccioná uno o más campos.
                </span>
              ) : molinosDisponibles.length === 0 ? (
                <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                  Sin molinos en el campo.
                </span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {molinosDisponibles.map((mol) => {
                    const activa = molinosSeleccionados.includes(
                      Number(mol.id),
                    );
                    return (
                      <button
                        key={mol.id}
                        type="button"
                        onClick={() => toggleMolino(mol.id)}
                        style={styles.chip(activa)}
                      >
                        {activa ? "✓ " : ""}
                        {mol.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 4. Datos del trabajo */}
          <div style={styles.section}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "10px",
              }}
            >
              <h3 style={styles.sectionTitle}>4. Datos del Trabajo</h3>
              <span style={styles.montoGrandePreview}>
                {formatearMontoVistaPrevia(montoTrabajo)}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "10px",
              }}
            >
              <div>
                <label style={styles.label}>Fecha *</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Monto del Trabajo *</label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={montoTrabajo}
                  onChange={(e) => setMontoTrabajo(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={styles.label}>Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Detalle del trabajo realizado..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* 5. Pagos (con checkbox habilitado por defecto) */}
          <div style={styles.section}>
            <div
              style={{
                ...styles.colHeader,
                marginBottom: cargarPago ? "12px" : 0,
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={cargarPago}
                  onChange={(e) => setCargarPago(e.target.checked)}
                />
                <span style={styles.sectionTitle}>
                  5. Cargar Pago{" "}
                  {cargarPago
                    ? `(${pagosLista.length} · Total: ${formatearMoneda(sumaPagos)})`
                    : "(deshabilitado)"}
                </span>
              </label>

              {cargarPago && (
                <button
                  type="button"
                  onClick={agregarLineaPago}
                  style={styles.btnMiniColor("#1d4ed8")}
                >
                  + Agregar forma de pago
                </button>
              )}
            </div>

            {cargarPago && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
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
                        padding: "12px",
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
                            fontSize: "0.82rem",
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
                            "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "10px",
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
                            step="0.01"
                            inputMode="decimal"
                            placeholder="0.00"
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
                            paddingTop: "10px",
                            marginTop: "10px",
                          }}
                        >
                          <div style={{ ...styles.label, marginBottom: "8px" }}>
                            Datos del Cheque ({formatearMoneda(p.monto)}) ·
                            Estado inicial: Pendiente
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: "10px",
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
                              <label style={styles.label}>Fecha de Cobro</label>
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
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button
              type="submit"
              disabled={guardando}
              style={{
                ...styles.btnSuccess,
                opacity: guardando ? 0.65 : 1,
              }}
            >
              {guardando ? "Guardando..." : "Guardar Trabajo"}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Confirmación antes de enviar POSTs */}
      {confirmacionGuardado &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setConfirmacionGuardado(null)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "1.18rem",
                  fontWeight: "800",
                }}
              >
                ¿Estás seguro de guardar este trabajo?
              </h3>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: "0.86rem",
                  color: "#475569",
                }}
              >
                Revisá los datos que se van a registrar antes de confirmar:
              </p>

              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.86rem",
                  marginBottom: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div>
                  <strong>Cliente:</strong> {confirmacionGuardado.clienteNombre}
                </div>
                <div>
                  <strong>Campos:</strong>{" "}
                  {confirmacionGuardado.nombresCampos.join(", ") || "—"}
                </div>
                <div>
                  <strong>Molinos:</strong>{" "}
                  {confirmacionGuardado.nombresMolinos.length > 0
                    ? confirmacionGuardado.nombresMolinos.join(", ")
                    : "Sin molinos seleccionados"}
                </div>
                <div>
                  <strong>Fecha:</strong>{" "}
                  {formatearFechaCorta(confirmacionGuardado.fecha)}
                </div>
                {confirmacionGuardado.descripcion && (
                  <div>
                    <strong>Descripción:</strong>{" "}
                    {confirmacionGuardado.descripcion}
                  </div>
                )}
                <div
                  style={{
                    borderTop: "1px solid #cbd5e1",
                    paddingTop: "8px",
                    marginTop: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "800",
                    fontSize: "0.95rem",
                  }}
                >
                  <span>Monto del trabajo:</span>
                  <span style={{ color: "#15803d" }}>
                    {formatearMoneda(confirmacionGuardado.montoTotalNum)}
                  </span>
                </div>
              </div>

              {confirmacionGuardado.cargarPago && (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    backgroundColor: "#f8fafc",
                    fontSize: "0.85rem",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontWeight: "800", marginBottom: "8px" }}>
                    Pagos a registrar (
                    {confirmacionGuardado.detallePagos.length})
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {confirmacionGuardado.detallePagos.map((dp, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          padding: "8px 10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: "700",
                          }}
                        >
                          <span>
                            #{i + 1} · {dp.tipoNombre}
                          </span>
                          <span>{formatearMoneda(dp.monto)}</span>
                        </div>
                        {dp.observacion && (
                          <div
                            style={{ fontSize: "0.78rem", color: "#475569" }}
                          >
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
                            Cheque N° {dp.cheque.numero_cheque} ·{" "}
                            {dp.cheque.banco} · Cobro:{" "}
                            {formatearFechaCorta(dp.cheque.fecha_cobro)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #cbd5e1",
                      marginTop: "10px",
                      paddingTop: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                    }}
                  >
                    <span>
                      Total pagado:{" "}
                      {formatearMoneda(
                        confirmacionGuardado.totalPagosConfirmado,
                      )}
                    </span>
                    <span style={{ color: "#b91c1c" }}>
                      Saldo pendiente:{" "}
                      {formatearMoneda(confirmacionGuardado.saldoPendiente)}
                    </span>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setConfirmacionGuardado(null)}
                  style={styles.btnSecondary}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={async () => {
                    const datos = confirmacionGuardado;
                    setConfirmacionGuardado(null);
                    await ejecutarGuardadoConfirmado(datos);
                  }}
                  style={styles.btnSuccess}
                >
                  Sí, guardar trabajo
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Nuevo Cliente */}
      {modalNuevoCliente &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setModalNuevoCliente(false)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem" }}>
                Nuevo Cliente, Campo y Molino
              </h3>

              {errorNuevoCliente && (
                <div style={styles.alertaError}>{errorNuevoCliente}</div>
              )}

              <form onSubmit={handleGuardarNuevoCliente}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={styles.label}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.nombre}
                    onChange={(e) =>
                      setNuevoCliente({
                        ...nuevoCliente,
                        nombre: e.target.value,
                      })
                    }
                    style={styles.input}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <label style={styles.label}>CUIT</label>
                    <input
                      type="text"
                      value={nuevoCliente.cuit}
                      onChange={(e) =>
                        setNuevoCliente({
                          ...nuevoCliente,
                          cuit: e.target.value,
                        })
                      }
                      style={styles.input}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Teléfono</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={nuevoCliente.telefono}
                      onChange={(e) =>
                        setNuevoCliente({
                          ...nuevoCliente,
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
                    paddingTop: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <label style={styles.label}>Nombre del Campo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: La Elisa"
                    value={nuevoCliente.campoNombre}
                    onChange={(e) =>
                      setNuevoCliente({
                        ...nuevoCliente,
                        campoNombre: e.target.value,
                      })
                    }
                    style={{ ...styles.input, marginBottom: "10px" }}
                  />

                  <label style={styles.label}>Nombre del Molino *</label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="text"
                      required
                      placeholder="Ej: Molino 1"
                      value={nuevoCliente.molinoNombre}
                      onChange={(e) =>
                        setNuevoCliente({
                          ...nuevoCliente,
                          molinoNombre: e.target.value,
                        })
                      }
                      style={styles.input}
                    />
                    <select
                      value={nuevoCliente.maquina}
                      onChange={(e) =>
                        setNuevoCliente({
                          ...nuevoCliente,
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
                      value={nuevoCliente.cilindro}
                      onChange={(e) =>
                        setNuevoCliente({
                          ...nuevoCliente,
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
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalNuevoCliente(false)}
                    style={styles.btnSecondary}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnSuccess}>
                    Crear Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Agregar Uno o Más Campos */}
      {modalNuevosCampos &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setModalNuevosCampos(false)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem" }}>
                Agregar Campos
              </h3>

              {errorNuevosCampos && (
                <div style={styles.alertaError}>{errorNuevosCampos}</div>
              )}

              <form onSubmit={handleGuardarNuevosCampos}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  {nombresNuevosCampos.map((nombreCamp, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        required={idx === 0}
                        placeholder={`Nombre del campo ${idx + 1}...`}
                        value={nombreCamp}
                        onChange={(e) => {
                          const copia = [...nombresNuevosCampos];
                          copia[idx] = e.target.value;
                          setNombresNuevosCampos(copia);
                        }}
                        style={styles.input}
                      />
                      {nombresNuevosCampos.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNombresNuevosCampos((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          style={styles.btnSecondary}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNombresNuevosCampos((prev) => [...prev, ""])
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#7c3aed",
                    fontWeight: "700",
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    padding: "4px 0",
                    marginBottom: "16px",
                  }}
                >
                  + Agregar otro campo
                </button>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalNuevosCampos(false)}
                    style={styles.btnSecondary}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnMiniColor("#7c3aed")}>
                    Guardar Campos
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Agregar Uno o Más Molinos */}
      {modalNuevosMolinos &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setModalNuevosMolinos(false)}
                style={styles.btnCloseX}
              >
                ✕
              </button>

              <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem" }}>
                Agregar Molinos
              </h3>

              {errorNuevosMolinos && (
                <div style={styles.alertaError}>{errorNuevosMolinos}</div>
              )}

              <form onSubmit={handleGuardarNuevosMolinos}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  {listaNuevosMolinos.map((mol, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "10px",
                        backgroundColor: "#f8fafc",
                        display: "grid",
                        gridTemplateColumns: "1fr 1.2fr 1fr 1fr auto",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={mol.campo_id}
                        onChange={(e) => {
                          const copia = [...listaNuevosMolinos];
                          copia[idx] = {
                            ...copia[idx],
                            campo_id: e.target.value,
                          };
                          setListaNuevosMolinos(copia);
                        }}
                        style={styles.select}
                      >
                        {camposSeleccionados.map((cId) => {
                          const cObj = campos.find(
                            (c) => Number(c.id) === Number(cId),
                          );
                          return (
                            <option key={cId} value={cId}>
                              {cObj?.nombre || `Campo #${cId}`}
                            </option>
                          );
                        })}
                      </select>

                      <input
                        type="text"
                        required={idx === 0}
                        placeholder="Nombre molino"
                        value={mol.nombre}
                        onChange={(e) => {
                          const copia = [...listaNuevosMolinos];
                          copia[idx] = {
                            ...copia[idx],
                            nombre: e.target.value,
                          };
                          setListaNuevosMolinos(copia);
                        }}
                        style={styles.input}
                      />

                      <select
                        value={mol.maquina}
                        onChange={(e) => {
                          const copia = [...listaNuevosMolinos];
                          copia[idx] = {
                            ...copia[idx],
                            maquina: e.target.value,
                          };
                          setListaNuevosMolinos(copia);
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
                          const copia = [...listaNuevosMolinos];
                          copia[idx] = {
                            ...copia[idx],
                            cilindro: e.target.value,
                          };
                          setListaNuevosMolinos(copia);
                        }}
                        style={styles.select}
                      >
                        {OPCIONES_CILINDRO.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>

                      {listaNuevosMolinos.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setListaNuevosMolinos((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          style={styles.btnSecondary}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setListaNuevosMolinos((prev) => [
                      ...prev,
                      {
                        campo_id: String(camposSeleccionados[0]),
                        nombre: "",
                        maquina: OPCIONES_MAQUINA[0],
                        cilindro: OPCIONES_CILINDRO[0],
                      },
                    ])
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0d9488",
                    fontWeight: "700",
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    padding: "4px 0",
                    marginBottom: "16px",
                  }}
                >
                  + Agregar otro molino
                </button>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalNuevosMolinos(false)}
                    style={styles.btnSecondary}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnMiniColor("#0d9488")}>
                    Guardar Molinos
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
