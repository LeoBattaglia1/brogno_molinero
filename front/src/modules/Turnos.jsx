import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "../api/api";

function IconoLista() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconoAlmanaque() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

const styles = {
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#0f172a",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "16px 18px",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.06)",
    marginBottom: "18px",
    color: "#0f172a",
  },
  vistaHeaderBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
    paddingBottom: "10px",
    borderBottom: "1px solid #e2e8f0",
    gap: "12px",
  },
  vistaTitulo: {
    margin: 0,
    fontSize: "1.02rem",
    fontWeight: "700",
    color: "#0f172a",
  },
  vistaSwitchGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px",
    backgroundColor: "#f1f5f9",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
  },
  btnIconoVista: (activo) => ({
    width: "30px",
    height: "28px",
    padding: 0,
    borderRadius: "6px",
    border: activo ? "1px solid #1d4ed8" : "1px solid transparent",
    backgroundColor: activo ? "#2563eb" : "transparent",
    color: activo ? "#ffffff" : "#334155",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  }),
  formAlta: {
    display: "grid",
    gridTemplateColumns:
      "128px 102px minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1.2fr) 92px",
    gap: "8px",
    alignItems: "end",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  label: {
    fontSize: "0.7rem",
    color: "#334155",
    marginBottom: "4px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    color: "#0f172a",
  },
  th: {
    textAlign: "left",
    padding: "10px 10px",
    borderBottom: "2px solid #cbd5e1",
    color: "#0f172a",
    fontWeight: "700",
    fontSize: "0.85rem",
    userSelect: "none",
    backgroundColor: "#f8fafc",
  },
  td: {
    padding: "10px 10px",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "middle",
    textAlign: "left",
    wordBreak: "break-word",
    color: "#0f172a",
    fontSize: "0.9rem",
  },
  inputControl: {
    height: "36px",
    padding: "0 8px",
    borderRadius: "6px",
    border: "1px solid #94a3b8",
    fontSize: "0.85rem",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  btnPrimary: {
    height: "32px",
    padding: "0 11px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSuccess: {
    height: "36px",
    padding: "0 10px",
    backgroundColor: "#15803d",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    whiteSpace: "nowrap",
  },
  btnSuccessInline: {
    height: "32px",
    padding: "0 10px",
    backgroundColor: "#15803d",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    height: "32px",
    padding: "0 11px",
    backgroundColor: "#475569",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDanger: {
    height: "32px",
    padding: "0 11px",
    backgroundColor: "#b91c1c",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  toastContainer: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  toast: (tipo) => ({
    padding: "12px 18px",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.9rem",
    fontWeight: "600",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.25)",
    backgroundColor: tipo === "error" ? "#b91c1c" : "#15803d",
  }),
  calendarHeaderNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  calendarTable: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  calendarTh: {
    backgroundColor: "#f1f5f9",
    border: "1px solid #cbd5e1",
    padding: "9px",
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "700",
    fontSize: "0.85rem",
  },
  calendarCell: {
    border: "1px solid #cbd5e1",
    height: "110px",
    verticalAlign: "top",
    padding: "6px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    position: "relative",
  },
  calendarCellToday: {
    border: "2px solid #2563eb",
    height: "110px",
    verticalAlign: "top",
    padding: "6px",
    backgroundColor: "#eff6ff",
    color: "#0f172a",
    position: "relative",
  },
  calendarCellOutside: {
    border: "1px solid #cbd5e1",
    height: "110px",
    verticalAlign: "top",
    padding: "6px",
    backgroundColor: "#f8fafc",
    color: "#475569",
    opacity: 0.72,
  },
  dayNumber: {
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "4px",
    display: "block",
  },
  turnoBadge: {
    backgroundColor: "#dbeafe",
    border: "1px solid #93c5fd",
    borderRadius: "4px",
    padding: "3px 6px",
    fontSize: "0.75rem",
    fontWeight: "600",
    marginBottom: "3px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
    color: "#1e3a8a",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "8px",
    maxWidth: "400px",
    width: "90%",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    textAlign: "center",
    color: "#0f172a",
  },
  modalTitle: {
    fontSize: "1.2rem",
    color: "#0f172a",
    marginBottom: "8px",
    marginTop: 0,
    fontWeight: "700",
  },
  modalText: {
    fontSize: "0.95rem",
    color: "#334155",
    marginBottom: "20px",
  },
  modalActions: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
  },
};

function obtenerHoyISO() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

function parsearFechaHora(fechaHora) {
  if (!fechaHora) return { fecha: "", hora: "" };
  const norm = String(fechaHora).replace("T", " ").trim();
  const [fPart, hPart] = norm.split(" ");
  return {
    fecha: fPart ? fPart.slice(0, 10) : "",
    hora: hPart ? hPart.slice(0, 5) : "",
  };
}

export default function Turnos({ onActualizado }) {
  const [turnos, setTurnos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [campos, setCampos] = useState([]);

  const [vista, setVista] = useState("tabla");
  const [fechaCalendario, setFechaCalendario] = useState(new Date());
  const [turnoAEliminar, setTurnoAEliminar] = useState(null);

  const hoyIso = useMemo(() => obtenerHoyISO(), []);

  // Formulario de alta
  const [nuevoFecha, setNuevoFecha] = useState(() => obtenerHoyISO());
  const [nuevoHora, setNuevoHora] = useState("");
  const [nuevoClienteId, setNuevoClienteId] = useState("");
  const [nuevoCampoId, setNuevoCampoId] = useState("");
  const [nuevoObservacion, setNuevoObservacion] = useState("");

  // Edición
  const [editId, setEditId] = useState(null);
  const [editFecha, setEditFecha] = useState("");
  const [editHora, setEditHora] = useState("");
  const [editClienteId, setEditClienteId] = useState("");
  const [editCampoId, setEditCampoId] = useState("");
  const [editObservacion, setEditObservacion] = useState("");

  const [toasts, setToasts] = useState([]);
  const toastIdCounter = useRef(0);

  const mostrarToast = useCallback((mensaje, tipo = "success") => {
    toastIdCounter.current += 1;
    const id = toastIdCounter.current;
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      const [resT, resC, resCp] = await Promise.all([
        api.get("/turnos").catch(() => ({ data: [] })),
        api.get("/clientes").catch(() => ({ data: [] })),
        api.get("/campos").catch(() => ({ data: [] })),
      ]);
      setTurnos(Array.isArray(resT.data) ? resT.data : []);
      setClientes(Array.isArray(resC.data) ? resC.data : []);
      setCampos(Array.isArray(resCp.data) ? resCp.data : []);
    } catch {
      mostrarToast("Error al cargar los turnos.", "error");
    }
  }, [mostrarToast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const construirFechaHora = (fecha, hora) =>
    hora ? `${fecha} ${hora}:00` : `${fecha} 00:00:00`;

  const handleCambioFechaAlta = (valor) => {
    const fechaLimpia = String(valor || "").slice(0, 10);
    const fechaMinima = obtenerHoyISO();
    if (fechaLimpia && fechaLimpia < fechaMinima) {
      setNuevoFecha(fechaMinima);
      mostrarToast(
        "No se puede seleccionar una fecha anterior a hoy.",
        "error",
      );
      return;
    }
    setNuevoFecha(fechaLimpia);
  };

  const handleCambioFechaEdit = (valor) => {
    const fechaLimpia = String(valor || "").slice(0, 10);
    const fechaMinima = obtenerHoyISO();
    if (fechaLimpia && fechaLimpia < fechaMinima) {
      setEditFecha(fechaMinima);
      mostrarToast(
        "No se puede seleccionar una fecha anterior a hoy.",
        "error",
      );
      return;
    }
    setEditFecha(fechaLimpia);
  };

  const camposFiltradosAlta = useMemo(() => {
    if (!nuevoClienteId) return campos;
    return campos.filter(
      (c) => Number(c.cliente_id) === Number(nuevoClienteId),
    );
  }, [campos, nuevoClienteId]);

  const camposFiltradosEdit = useMemo(() => {
    if (!editClienteId) return campos;
    return campos.filter((c) => Number(c.cliente_id) === Number(editClienteId));
  }, [campos, editClienteId]);

  const handleCambioClienteAlta = (cliId) => {
    setNuevoClienteId(cliId);
    const delCliente = campos.filter(
      (c) => Number(c.cliente_id) === Number(cliId),
    );
    setNuevoCampoId(delCliente.length === 1 ? String(delCliente[0].id) : "");
  };

  const handleCrearTurno = async (e) => {
    e.preventDefault();
    const fechaActual = obtenerHoyISO();
    const fechaElegida = String(nuevoFecha || "").slice(0, 10);

    if (!fechaElegida || !nuevoClienteId || !nuevoCampoId) {
      mostrarToast("Completa los campos obligatorios.", "error");
      return;
    }

    if (fechaElegida < fechaActual) {
      setNuevoFecha(fechaActual);
      mostrarToast(
        "No se puede agendar un turno con fecha anterior a hoy.",
        "error",
      );
      return;
    }

    try {
      await api.post("/turnos", {
        cliente_id: Number(nuevoClienteId),
        campo_id: Number(nuevoCampoId),
        fecha_hora: construirFechaHora(fechaElegida, nuevoHora),
        observacion: nuevoObservacion.trim() || null,
      });

      setNuevoFecha(fechaActual);
      setNuevoHora("");
      setNuevoClienteId("");
      setNuevoCampoId("");
      setNuevoObservacion("");

      await cargarDatos();
      if (onActualizado) onActualizado();
      mostrarToast("Turno agendado correctamente.");
    } catch (err) {
      const msg = err.response?.data?.error || "No se pudo registrar el turno.";
      mostrarToast(msg, "error");
    }
  };

  const ejecutarEliminarTurno = async () => {
    if (!turnoAEliminar) return;
    try {
      await api.delete(`/turnos/${turnoAEliminar}`);
      await cargarDatos();
      if (onActualizado) onActualizado();
      mostrarToast("Turno eliminado.");
    } catch (err) {
      const msg = err.response?.data?.error || "Error al eliminar.";
      mostrarToast(msg, "error");
    } finally {
      setTurnoAEliminar(null);
    }
  };

  const iniciarEdicion = (item) => {
    setEditId(item.id);
    const { fecha, hora } = parsearFechaHora(item.fecha_hora);
    const fechaMinima = obtenerHoyISO();
    setEditFecha(fecha && fecha >= fechaMinima ? fecha : fechaMinima);
    setEditHora(hora);
    setEditClienteId(item.cliente_id?.toString() || "");
    setEditCampoId(item.campo_id?.toString() || "");
    setEditObservacion(item.observacion || "");
  };

  const handleGuardarEdicion = async (id) => {
    const fechaActual = obtenerHoyISO();
    const fechaElegida = String(editFecha || "").slice(0, 10);

    if (!fechaElegida || !editClienteId || !editCampoId) {
      mostrarToast("Completa fecha, cliente y campo.", "error");
      return;
    }

    if (fechaElegida < fechaActual) {
      setEditFecha(fechaActual);
      mostrarToast("No se puede asignar una fecha anterior a hoy.", "error");
      return;
    }

    try {
      await api.put(`/turnos/${id}`, {
        cliente_id: Number(editClienteId),
        campo_id: Number(editCampoId),
        fecha_hora: construirFechaHora(fechaElegida, editHora),
        observacion: editObservacion.trim() || null,
      });
      setEditId(null);
      await cargarDatos();
      if (onActualizado) onActualizado();
      mostrarToast("Turno actualizado.");
    } catch (err) {
      const msg = err.response?.data?.error || "Error al actualizar.";
      mostrarToast(msg, "error");
    }
  };

  const turnosFiltradosYOrdenados = useMemo(() => {
    const hoyIsoStr = obtenerHoyISO();

    return turnos
      .filter((t) => {
        const { fecha } = parsearFechaHora(t.fecha_hora);
        if (!fecha) return true;
        return fecha >= hoyIsoStr;
      })
      .sort((a, b) => {
        const normA = String(a.fecha_hora || "").replace("T", " ");
        const normB = String(b.fecha_hora || "").replace("T", " ");
        return normA.localeCompare(normB);
      });
  }, [turnos]);

  const cambiarMes = (delta) => {
    setFechaCalendario(
      new Date(
        fechaCalendario.getFullYear(),
        fechaCalendario.getMonth() + delta,
        1,
      ),
    );
  };

  const nombreMesAnio = useMemo(() => {
    return fechaCalendario.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }, [fechaCalendario]);

  const matrizDiasMes = useMemo(() => {
    const year = fechaCalendario.getFullYear();
    const month = fechaCalendario.getMonth();
    const primerDiaDelMes = new Date(year, month, 1);
    const ultimoDiaDelMes = new Date(year, month + 1, 0);

    let diaSemanaInicio = primerDiaDelMes.getDay();
    diaSemanaInicio = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;

    const diasEnMes = ultimoDiaDelMes.getDate();
    const celdas = [];

    const ultimoDiaMesAnterior = new Date(year, month, 0).getDate();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      celdas.push({
        fechaObj: new Date(year, month - 1, ultimoDiaMesAnterior - i),
        esMesActual: false,
      });
    }

    for (let i = 1; i <= diasEnMes; i++) {
      celdas.push({ fechaObj: new Date(year, month, i), esMesActual: true });
    }

    const totalCeldasRestantes = (7 - (celdas.length % 7)) % 7;
    for (let i = 1; i <= totalCeldasRestantes; i++) {
      celdas.push({
        fechaObj: new Date(year, month + 1, i),
        esMesActual: false,
      });
    }

    return celdas;
  }, [fechaCalendario]);

  const renderSwitchVistas = () => (
    <div
      style={styles.vistaSwitchGroup}
      role="group"
      aria-label="Cambiar vista"
    >
      <button
        type="button"
        title="Vista Tabla"
        aria-label="Vista Tabla"
        style={styles.btnIconoVista(vista === "tabla")}
        onClick={() => setVista("tabla")}
      >
        <IconoLista />
      </button>
      <button
        type="button"
        title="Vista Almanaque"
        aria-label="Vista Almanaque"
        style={styles.btnIconoVista(vista === "almanaque")}
        onClick={() => setVista("almanaque")}
      >
        <IconoAlmanaque />
      </button>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.toastContainer}>
        {toasts.map((t) => (
          <div key={t.id} style={styles.toast(t.tipo)}>
            {t.mensaje}
          </div>
        ))}
      </div>

      {vista === "tabla" && (
        <>
          <div style={styles.card}>
            <h3
              style={{
                margin: "0 0 10px 0",
                color: "#0f172a",
                fontSize: "0.98rem",
                fontWeight: "700",
              }}
            >
              Agendar Nuevo Turno
            </h3>
            <form onSubmit={handleCrearTurno} style={styles.formAlta}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Fecha *</label>
                <input
                  type="date"
                  required
                  min={hoyIso}
                  value={nuevoFecha}
                  onChange={(e) => handleCambioFechaAlta(e.target.value)}
                  onBlur={(e) => handleCambioFechaAlta(e.target.value)}
                  style={styles.inputControl}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Hora</label>
                <input
                  type="time"
                  value={nuevoHora}
                  onChange={(e) => setNuevoHora(e.target.value)}
                  style={styles.inputControl}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Cliente *</label>
                <select
                  value={nuevoClienteId}
                  onChange={(e) => handleCambioClienteAlta(e.target.value)}
                  style={styles.inputControl}
                >
                  <option value="">-- Cliente --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Campo *</label>
                <select
                  value={nuevoCampoId}
                  onChange={(e) => setNuevoCampoId(e.target.value)}
                  style={styles.inputControl}
                >
                  <option value="">-- Campo --</option>
                  {camposFiltradosAlta.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Observación</label>
                <input
                  type="text"
                  placeholder="Detalle..."
                  value={nuevoObservacion}
                  onChange={(e) => setNuevoObservacion(e.target.value)}
                  style={styles.inputControl}
                />
              </div>
              <div style={styles.fieldGroup}>
                <button type="submit" style={styles.btnSuccess}>
                  + Agendar
                </button>
              </div>
            </form>
          </div>

          <div style={styles.card}>
            <div style={styles.vistaHeaderBar}>
              <h3 style={styles.vistaTitulo}>Próximos Turnos</h3>
              {renderSwitchVistas()}
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: "130px" }}>Fecha</th>
                  <th style={{ ...styles.th, width: "100px" }}>Hora</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Campo</th>
                  <th style={styles.th}>Observación</th>
                  <th
                    style={{
                      ...styles.th,
                      textAlign: "center",
                      width: "180px",
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {turnosFiltradosYOrdenados.length > 0 ? (
                  turnosFiltradosYOrdenados.map((item) => {
                    const enEdicion = editId === item.id;
                    const clienteObj = clientes.find(
                      (c) => Number(c.id) === Number(item.cliente_id),
                    );
                    const campoObj = campos.find(
                      (cp) => Number(cp.id) === Number(item.campo_id),
                    );

                    const { fecha: fPart, hora: hPart } = parsearFechaHora(
                      item.fecha_hora,
                    );
                    let fechaFormateada = "-";
                    if (fPart) {
                      const [anio, mes, dia] = fPart.split("-");
                      fechaFormateada = `${dia}/${mes}/${anio}`;
                    }
                    const horaFormateada =
                      hPart && hPart !== "00:00"
                        ? `${hPart} hs`
                        : "Sin horario";

                    return (
                      <tr key={item.id}>
                        <td style={styles.td}>
                          {enEdicion ? (
                            <input
                              type="date"
                              min={hoyIso}
                              value={editFecha}
                              onChange={(e) =>
                                handleCambioFechaEdit(e.target.value)
                              }
                              onBlur={(e) =>
                                handleCambioFechaEdit(e.target.value)
                              }
                              style={styles.inputControl}
                            />
                          ) : (
                            fechaFormateada
                          )}
                        </td>
                        <td style={styles.td}>
                          {enEdicion ? (
                            <input
                              type="time"
                              value={editHora}
                              onChange={(e) => setEditHora(e.target.value)}
                              style={styles.inputControl}
                            />
                          ) : (
                            horaFormateada
                          )}
                        </td>
                        <td style={styles.td}>
                          {enEdicion ? (
                            <select
                              value={editClienteId}
                              onChange={(e) => setEditClienteId(e.target.value)}
                              style={styles.inputControl}
                            >
                              {clientes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre}
                                </option>
                              ))}
                            </select>
                          ) : (
                            clienteObj?.nombre || "Sin cliente"
                          )}
                        </td>
                        <td style={styles.td}>
                          {enEdicion ? (
                            <select
                              value={editCampoId}
                              onChange={(e) => setEditCampoId(e.target.value)}
                              style={styles.inputControl}
                            >
                              {camposFiltradosEdit.map((cp) => (
                                <option key={cp.id} value={cp.id}>
                                  {cp.nombre}
                                </option>
                              ))}
                            </select>
                          ) : (
                            campoObj?.nombre || "Sin campo"
                          )}
                        </td>
                        <td style={styles.td}>
                          {enEdicion ? (
                            <input
                              type="text"
                              value={editObservacion}
                              onChange={(e) =>
                                setEditObservacion(e.target.value)
                              }
                              style={styles.inputControl}
                            />
                          ) : (
                            item.observacion || "-"
                          )}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            textAlign: "center",
                            width: "180px",
                          }}
                        >
                          {enEdicion ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                justifyContent: "center",
                              }}
                            >
                              <button
                                onClick={() => handleGuardarEdicion(item.id)}
                                style={styles.btnSuccessInline}
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                style={styles.btnSecondary}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                justifyContent: "center",
                              }}
                            >
                              <button
                                onClick={() => iniciarEdicion(item)}
                                style={styles.btnPrimary}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setTurnoAEliminar(item.id)}
                                style={styles.btnDanger}
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#334155",
                        fontWeight: "500",
                      }}
                    >
                      No hay turnos próximos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {vista === "almanaque" && (
        <div style={styles.card}>
          <div style={styles.vistaHeaderBar}>
            <h3 style={styles.vistaTitulo}>Calendario de Turnos</h3>
            {renderSwitchVistas()}
          </div>

          <div style={styles.calendarHeaderNav}>
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              style={styles.btnSecondary}
            >
              ◀ Mes Anterior
            </button>
            <h2
              style={{
                margin: 0,
                textTransform: "capitalize",
                fontSize: "1.15rem",
                color: "#0f172a",
                fontWeight: "700",
              }}
            >
              {nombreMesAnio}
            </h2>
            <button
              type="button"
              onClick={() => cambiarMes(1)}
              style={styles.btnSecondary}
            >
              Mes Siguiente ▶
            </button>
          </div>

          <table style={styles.calendarTable}>
            <thead>
              <tr>
                {[
                  "Lunes",
                  "Martes",
                  "Miércoles",
                  "Jueves",
                  "Viernes",
                  "Sábado",
                  "Domingo",
                ].map((dia, i) => (
                  <th key={i} style={styles.calendarTh}>
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(matrizDiasMes.length / 7) }).map(
                (_, semanaIdx) => (
                  <tr key={semanaIdx}>
                    {matrizDiasMes
                      .slice(semanaIdx * 7, (semanaIdx + 1) * 7)
                      .map((celda, diaIdx) => {
                        const fechaIso = `${celda.fechaObj.getFullYear()}-${String(celda.fechaObj.getMonth() + 1).padStart(2, "0")}-${String(celda.fechaObj.getDate()).padStart(2, "0")}`;
                        const esHoy = fechaIso === hoyIso;

                        const turnosDelDia = turnos.filter((t) => {
                          const { fecha } = parsearFechaHora(t.fecha_hora);
                          return fecha === fechaIso;
                        });

                        let cellStyle = styles.calendarCell;
                        if (esHoy) {
                          cellStyle = styles.calendarCellToday;
                        } else if (!celda.esMesActual) {
                          cellStyle = styles.calendarCellOutside;
                        }

                        return (
                          <td key={diaIdx} style={cellStyle}>
                            <span style={styles.dayNumber}>
                              {celda.fechaObj.getDate()}
                            </span>
                            <div
                              style={{ maxHeight: "75px", overflowY: "auto" }}
                            >
                              {turnosDelDia.map((t) => {
                                const clienteObj = clientes.find(
                                  (c) => Number(c.id) === Number(t.cliente_id),
                                );
                                const nombreCli = clienteObj
                                  ? clienteObj.nombre
                                  : "Turno";
                                const { hora } = parsearFechaHora(t.fecha_hora);
                                const horaVisible =
                                  hora && hora !== "00:00" ? hora : "";

                                return (
                                  <div
                                    key={t.id}
                                    style={styles.turnoBadge}
                                    onClick={() => {
                                      setVista("tabla");
                                      iniciarEdicion(t);
                                    }}
                                    title={`${horaVisible ? `${horaVisible} - ` : ""}${nombreCli}`}
                                  >
                                    {horaVisible ? `${horaVisible} ` : ""}
                                    {nombreCli}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {turnoAEliminar && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>¿Eliminar turno?</h3>
            <p style={styles.modalText}>
              Esta acción borrará el turno seleccionado.
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setTurnoAEliminar(null)}
                style={styles.btnSecondary}
              >
                Cancelar
              </button>
              <button onClick={ejecutarEliminarTurno} style={styles.btnDanger}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
