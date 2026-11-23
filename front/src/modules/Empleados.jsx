import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseFechaLocal(isoStr) {
  if (!isoStr) return null;
  const limpia = String(isoStr)
    .replace("T", " ")
    .trim()
    .split(" ")[0]
    .slice(0, 10);
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
  const num = Number(valor || 0);
  return num.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function esActivo(valor) {
  return valor === 1 || valor === true || String(valor) === "1";
}

function obtenerIniciales(nombre = "") {
  const partes = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "EM";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

const PALETA_AVATAR = [
  { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  { bg: "#f3e8ff", color: "#6b21a8", border: "#d8b4fe" },
  { bg: "#ffedd5", color: "#9a3412", border: "#fdba74" },
  { bg: "#e0f2fe", color: "#075985", border: "#7dd3fc" },
  { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
];

function estiloAvatar(idOrIndex = 0) {
  const idx = Math.abs(Number(idOrIndex) || 0) % PALETA_AVATAR.length;
  return PALETA_AVATAR[idx];
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
    flexWrap: "wrap",
  },
  panelTitle: {
    margin: 0,
    fontSize: "1.02rem",
    fontWeight: "800",
    color: "#0f172a",
  },
  credencialCard: (seleccionada, activa) => ({
    width: "100%",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "11px 13px",
    borderRadius: "11px",
    border: seleccionada ? "2px solid #0f172a" : "1px solid #e2e8f0",
    borderLeft: seleccionada
      ? "6px solid #2563eb"
      : `6px solid ${activa ? "#16a34a" : "#94a3b8"}`,
    backgroundColor: seleccionada ? "#f8fafc" : activa ? "#ffffff" : "#f8fafc",
    opacity: activa ? 1 : 0.78,
    cursor: "pointer",
    transition:
      "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
    boxShadow: seleccionada
      ? "0 10px 20px -6px rgba(15, 23, 42, 0.18)"
      : "0 2px 6px rgba(15, 23, 42, 0.04)",
  }),
  avatarBadge: (av) => ({
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    backgroundColor: av.bg,
    color: av.color,
    border: `1.5px solid ${av.border}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "0.92rem",
    flexShrink: 0,
    letterSpacing: "0.03em",
  }),
  pillEstado: (activo) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "0.73rem",
    fontWeight: "800",
    backgroundColor: activo ? "#dcfce7" : "#f1f5f9",
    color: activo ? "#166534" : "#475569",
    border: `1px solid ${activo ? "#86efac" : "#cbd5e1"}`,
  }),
  fichaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px",
    borderRadius: "11px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    marginBottom: "14px",
    flexWrap: "wrap",
  },
  statBox: {
    padding: "10px 12px",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    flex: "1 1 140px",
  },
  section: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "13px",
    backgroundColor: "#f8fafc",
    marginTop: "12px",
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
  btnPrimary: {
    padding: "8px 13px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
  },
  btnSuccess: {
    padding: "10px 16px",
    background: "linear-gradient(135deg, #2e6f40 0%, #1d4d2b 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.88rem",
    fontWeight: "700",
    boxShadow: "0 4px 12px rgba(46, 111, 64, 0.25)",
    whiteSpace: "nowrap",
  },
  btnSecondary: {
    padding: "9px 14px",
    backgroundColor: "#64748b",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
  },
  btnSoftToggle: (activo) => ({
    padding: "6px 10px",
    backgroundColor: activo ? "#fef2f2" : "#f0fdf4",
    color: activo ? "#991b1b" : "#166534",
    border: `1px solid ${activo ? "#fca5a5" : "#86efac"}`,
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.76rem",
    whiteSpace: "nowrap",
  }),
  alertaError: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "700",
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
    maxWidth: "480px",
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

export default function Empleados({ onActualizado }) {
  const [empleados, setEmpleados] = useState([]);
  const [pagosEmpleados, setPagosEmpleados] = useState([]);
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState(null);
  const [soloActivos, setSoloActivos] = useState(false);

  // Modal nuevo empleado
  const [modalNuevoEmpleado, setModalNuevoEmpleado] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [errorNuevoEmpleado, setErrorNuevoEmpleado] = useState("");
  const [creandoEmpleado, setCreandoEmpleado] = useState(false);

  // Formulario / modal nuevo pago a empleado
  const [mostrarFormPago, setMostrarFormPago] = useState(false);
  const [fechaPago, setFechaPago] = useState(() => hoyISO());
  const [montoPago, setMontoPago] = useState("");
  const [observacionPago, setObservacionPago] = useState("");
  const [errorPago, setErrorPago] = useState("");
  const [confirmacionPago, setConfirmacionPago] = useState(null);
  const [guardandoPago, setGuardandoPago] = useState(false);

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
      const [resEmp, resPag] = await Promise.all([
        api.get("/empleados").catch(() => ({ data: [] })),
        api.get("/empleados_pagos").catch(() => ({ data: [] })),
      ]);

      const listaEmp = Array.isArray(resEmp.data) ? resEmp.data : [];
      const listaPag = Array.isArray(resPag.data) ? resPag.data : [];

      setEmpleados(listaEmp);
      setPagosEmpleados(listaPag);
    } catch (err) {
      console.error("Error cargando Empleados:", err);
      mostrarAviso(
        "Error de conexión",
        "No se pudieron cargar los empleados y sus pagos.",
        "error",
      );
    }
  }, [mostrarAviso]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const pagosPorEmpleado = useMemo(() => {
    const mapa = new Map();
    for (const p of pagosEmpleados) {
      const eid = Number(p.empleado_id);
      const arr = mapa.get(eid) || [];
      arr.push(p);
      mapa.set(eid, arr);
    }
    for (const [eid, arr] of mapa.entries()) {
      arr.sort((a, b) => {
        const fa = String(a.fecha || a.creado_en || "");
        const fb = String(b.fecha || b.creado_en || "");
        if (fb !== fa) return fb.localeCompare(fa);
        return Number(b.id || 0) - Number(a.id || 0);
      });
      mapa.set(eid, arr);
    }
    return mapa;
  }, [pagosEmpleados]);

  const empleadosEnriquecidos = useMemo(() => {
    return empleados.map((emp, idx) => {
      const eid = Number(emp.id);
      const pagosEmp = pagosPorEmpleado.get(eid) || [];
      const totalPagado = pagosEmp.reduce(
        (acc, p) => acc + Number(p.monto || 0),
        0,
      );
      return {
        ...emp,
        _idx: idx,
        activoBool: esActivo(emp.activo),
        pagos: pagosEmp,
        totalPagado,
      };
    });
  }, [empleados, pagosPorEmpleado]);

  const empleadosVisibles = useMemo(() => {
    if (!soloActivos) return empleadosEnriquecidos;
    return empleadosEnriquecidos.filter((e) => e.activoBool);
  }, [empleadosEnriquecidos, soloActivos]);

  const empleadoSeleccionado = useMemo(
    () =>
      empleadosEnriquecidos.find(
        (e) => Number(e.id) === Number(empleadoSeleccionadoId),
      ) || null,
    [empleadosEnriquecidos, empleadoSeleccionadoId],
  );

  const handleSeleccionarEmpleado = (empId) => {
    setEmpleadoSeleccionadoId(Number(empId));
    setMostrarFormPago(false);
    setErrorPago("");
    setFechaPago(hoyISO());
    setMontoPago("");
    setObservacionPago("");
  };

  const buscarEmpleadoDuplicado = (nombre, telefono) => {
    const nombreNorm = String(nombre || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const telLimpio = String(telefono || "").replace(/\D/g, "");

    return empleados.find((emp) => {
      const empNombreNorm = String(emp.nombre || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      if (nombreNorm && empNombreNorm === nombreNorm) return true;

      const empTelLimpio = String(emp.telefono || "").replace(/\D/g, "");
      if (telLimpio && telLimpio.length >= 6 && empTelLimpio === telLimpio) {
        return true;
      }
      return false;
    });
  };

  const handleCrearEmpleado = async (e) => {
    e.preventDefault();
    setErrorNuevoEmpleado("");

    const nombreTrim = nuevoNombre.trim();
    const telTrim = nuevoTelefono.trim();

    if (!nombreTrim) {
      setErrorNuevoEmpleado("Ingresá el nombre del empleado.");
      return;
    }

    const duplicado = buscarEmpleadoDuplicado(nombreTrim, telTrim);
    if (duplicado) {
      const msg = `Ya existe un empleado registrado con ese dato (${duplicado.nombre}). No se puede crear un empleado duplicado.`;
      setErrorNuevoEmpleado(msg);
      mostrarAviso("Empleado ya existe", msg, "error");
      return;
    }

    setCreandoEmpleado(true);
    try {
      const res = await api.post("/empleados", {
        nombre: nombreTrim,
        telefono: telTrim || null,
        activo: 1,
      });

      await cargarDatos();
      if (res.data?.id) {
        setEmpleadoSeleccionadoId(Number(res.data.id));
      }

      setNuevoNombre("");
      setNuevoTelefono("");
      setModalNuevoEmpleado(false);
      mostrarAviso("Empleado creado", `${nombreTrim} se agregó como activo.`);

      if (onActualizado) onActualizado();
    } catch (err) {
      console.error("Error creando empleado:", err);
      const msg = err.response?.data?.error || "No se pudo crear el empleado.";
      setErrorNuevoEmpleado(msg);
      mostrarAviso("Error al crear empleado", msg, "error");
    } finally {
      setCreandoEmpleado(false);
    }
  };

  const handleAlternarEstadoEmpleado = async (empObj) => {
    if (!empObj?.id) return;
    const nuevoEstado = empObj.activoBool ? 0 : 1;
    try {
      try {
        await api.patch(`/empleados/${empObj.id}`, { activo: nuevoEstado });
      } catch {
        await api.put(`/empleados/${empObj.id}`, {
          nombre: empObj.nombre,
          telefono: empObj.telefono || null,
          activo: nuevoEstado,
        });
      }

      setEmpleados((prev) =>
        prev.map((c) =>
          Number(c.id) === Number(empObj.id)
            ? { ...c, activo: nuevoEstado }
            : c,
        ),
      );
      mostrarAviso(
        nuevoEstado === 1 ? "Empleado activado" : "Empleado inactivo",
        `${empObj.nombre} ahora figura como ${nuevoEstado === 1 ? "activo" : "inactivo"}.`,
      );
      if (onActualizado) onActualizado();
    } catch (err) {
      console.error("Error actualizando estado de empleado:", err);
      mostrarAviso(
        "Error",
        "No se pudo cambiar el estado del empleado.",
        "error",
      );
    }
  };

  const handlePrepararPago = (e) => {
    e.preventDefault();
    setErrorPago("");

    if (!empleadoSeleccionado) {
      setErrorPago("Seleccioná un empleado.");
      return;
    }
    if (!fechaPago) {
      setErrorPago("Indicá la fecha del pago.");
      return;
    }

    const montoNum = Number(montoPago);
    if (!montoPago || Number.isNaN(montoNum) || montoNum <= 0) {
      setErrorPago("Ingresá un monto mayor a 0.");
      return;
    }

    setConfirmacionPago({
      empleado_id: Number(empleadoSeleccionado.id),
      empleadoNombre: empleadoSeleccionado.nombre,
      fecha: fechaPago,
      monto: montoNum,
      observacion: observacionPago.trim(),
    });
  };

  const ejecutarPagoConfirmado = async (datosPago) => {
    setGuardandoPago(true);
    try {
      await api.post("/empleados_pagos", {
        empleado_id: datosPago.empleado_id,
        fecha: datosPago.fecha,
        monto: datosPago.monto,
        observacion: datosPago.observacion || null,
      });

      setMontoPago("");
      setObservacionPago("");
      setFechaPago(hoyISO());
      setMostrarFormPago(false);
      await cargarDatos();

      mostrarAviso(
        "Pago agendado y registrado",
        `Se registraron ${formatearMoneda(datosPago.monto)} para ${datosPago.empleadoNombre}.`,
      );

      if (onActualizado) onActualizado();
    } catch (err) {
      console.error("Error registrando pago de empleado:", err);
      const msg = err.response?.data?.error || "No se pudo registrar el pago.";
      setErrorPago(msg);
      mostrarAviso("Error al registrar pago", msg, "error");
    } finally {
      setGuardandoPago(false);
    }
  };

  const totalActivos = useMemo(
    () => empleadosEnriquecidos.filter((e) => e.activoBool).length,
    [empleadosEnriquecidos],
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
        {/* COLUMNA IZQUIERDA: Credenciales / Legajos del equipo */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>
                Equipo ({empleadosVisibles.length})
              </h2>
              <div
                style={{
                  fontSize: "0.76rem",
                  color: "#64748b",
                  marginTop: "2px",
                }}
              >
                {totalActivos} activos de {empleadosEnriquecidos.length} en
                total
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setSoloActivos((prev) => !prev)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: soloActivos
                    ? "1.5px solid #15803d"
                    : "1px solid #cbd5e1",
                  backgroundColor: soloActivos ? "#dcfce7" : "#f8fafc",
                  color: soloActivos ? "#166534" : "#334155",
                  fontWeight: "700",
                  fontSize: "0.76rem",
                  cursor: "pointer",
                }}
              >
                {soloActivos ? "Solo activos ✓" : "Todos"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorNuevoEmpleado("");
                  setNuevoNombre("");
                  setNuevoTelefono("");
                  setModalNuevoEmpleado(true);
                }}
                style={styles.btnPrimary}
              >
                + Nuevo empleado
              </button>
            </div>
          </div>

          {empleadosVisibles.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                color: "#64748b",
                fontSize: "0.88rem",
              }}
            >
              No hay empleados para mostrar.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "9px",
                maxHeight: "480px",
                overflowY: "auto",
                paddingRight: "2px",
              }}
            >
              {empleadosVisibles.map((emp) => {
                const seleccionada =
                  Number(empleadoSeleccionadoId) === Number(emp.id);
                const av = estiloAvatar(emp.id ?? emp._idx);

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSeleccionarEmpleado(emp.id)}
                    style={styles.credencialCard(seleccionada, emp.activoBool)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "11px",
                        minWidth: 0,
                      }}
                    >
                      <div style={styles.avatarBadge(av)}>
                        {obtenerIniciales(emp.nombre)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "800",
                              fontSize: "0.94rem",
                              color: "#0f172a",
                            }}
                          >
                            {emp.nombre}
                          </span>
                          <span style={styles.pillEstado(emp.activoBool)}>
                            {emp.activoBool ? "● Activo" : "○ Inactivo"}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "#64748b",
                            marginTop: "3px",
                          }}
                        >
                          Tel: {emp.telefono || "Sin teléfono"} · Alta:{" "}
                          {formatearFechaCorta(emp.creado_en)}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          fontWeight: "700",
                        }}
                      >
                        Pagado ({emp.pagos.length})
                      </div>
                      <div
                        style={{
                          fontWeight: "900",
                          fontSize: "0.92rem",
                          color: "#0f172a",
                        }}
                      >
                        {formatearMoneda(emp.totalPagado)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Detalle del empleado seleccionado + Pagos + Agendar pago */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>
              {empleadoSeleccionado
                ? `Legajo de ${empleadoSeleccionado.nombre}`
                : "Detalle de Empleado"}
            </h2>

            {empleadoSeleccionado && (
              <button
                type="button"
                onClick={() => {
                  setMostrarFormPago((prev) => !prev);
                  setErrorPago("");
                }}
                style={styles.btnSuccess}
              >
                {mostrarFormPago ? "Cerrar formulario" : "+ Agendar nuevo pago"}
              </button>
            )}
          </div>

          {!empleadoSeleccionado ? (
            <div
              style={{
                padding: "32px 18px",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                border: "1px dashed #cbd5e1",
                color: "#64748b",
                fontSize: "0.9rem",
              }}
            >
              Seleccioná un empleado de la lista para ver toda su información,
              sus pagos realizados y agendar uno nuevo.
            </div>
          ) : (
            <>
              <div style={styles.fichaHeader}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={styles.avatarBadge(
                      estiloAvatar(empleadoSeleccionado.id),
                    )}
                  >
                    {obtenerIniciales(empleadoSeleccionado.nombre)}
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "900",
                          fontSize: "1.05rem",
                          color: "#0f172a",
                        }}
                      >
                        {empleadoSeleccionado.nombre}
                      </span>
                      <span
                        style={styles.pillEstado(
                          empleadoSeleccionado.activoBool,
                        )}
                      >
                        {empleadoSeleccionado.activoBool
                          ? "● Activo"
                          : "○ Inactivo"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#475569",
                        marginTop: "4px",
                      }}
                    >
                      Teléfono:{" "}
                      <strong>
                        {empleadoSeleccionado.telefono || "No registrado"}
                      </strong>
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "#64748b",
                        marginTop: "2px",
                      }}
                    >
                      Registrado el:{" "}
                      {formatearFechaCorta(empleadoSeleccionado.creado_en)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleAlternarEstadoEmpleado(empleadoSeleccionado)
                  }
                  style={styles.btnSoftToggle(empleadoSeleccionado.activoBool)}
                >
                  {empleadoSeleccionado.activoBool
                    ? "Marcar inactivo"
                    : "Marcar activo"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                <div style={styles.statBox}>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#64748b",
                      fontWeight: "700",
                    }}
                  >
                    Pagos realizados
                  </div>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: "900",
                      color: "#0f172a",
                      marginTop: "2px",
                    }}
                  >
                    {empleadoSeleccionado.pagos.length}
                  </div>
                </div>
                <div style={styles.statBox}>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#64748b",
                      fontWeight: "700",
                    }}
                  >
                    Total abonado
                  </div>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: "900",
                      color: "#15803d",
                      marginTop: "2px",
                    }}
                  >
                    {formatearMoneda(empleadoSeleccionado.totalPagado)}
                  </div>
                </div>
              </div>

              {/* Formulario para agendar nuevo pago */}
              {mostrarFormPago && (
                <form onSubmit={handlePrepararPago} style={styles.section}>
                  <div
                    style={{
                      fontWeight: "800",
                      fontSize: "0.92rem",
                      color: "#0f172a",
                      marginBottom: "10px",
                    }}
                  >
                    Agendar Nuevo Pago
                  </div>

                  {errorPago && (
                    <div style={styles.alertaError}>{errorPago}</div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <label style={styles.label}>Fecha *</label>
                      <input
                        type="date"
                        value={fechaPago}
                        onChange={(e) => setFechaPago(e.target.value)}
                        style={styles.input}
                      />
                    </div>

                    <div>
                      <label style={styles.label}>Monto *</label>
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0"
                        value={montoPago}
                        onChange={(e) => setMontoPago(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={styles.label}>Observación (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: Adelanto, quincena, viáticos..."
                      value={observacionPago}
                      onChange={(e) => setObservacionPago(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setMostrarFormPago(false)}
                      style={styles.btnSecondary}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={guardandoPago}
                      style={{
                        ...styles.btnSuccess,
                        opacity: guardandoPago ? 0.65 : 1,
                      }}
                    >
                      {guardandoPago ? "Guardando..." : "Confirmar pago"}
                    </button>
                  </div>
                </form>
              )}

              {/* Historial de pagos realizados */}
              <div style={styles.section}>
                <div
                  style={{
                    fontWeight: "800",
                    fontSize: "0.92rem",
                    color: "#0f172a",
                    marginBottom: "10px",
                  }}
                >
                  Pagos realizados ({empleadoSeleccionado.pagos.length})
                </div>

                {empleadoSeleccionado.pagos.length === 0 ? (
                  <div
                    style={{
                      padding: "14px",
                      textAlign: "center",
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      color: "#64748b",
                      fontSize: "0.84rem",
                    }}
                  >
                    Este empleado todavía no tiene pagos registrados.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: "260px",
                      overflowY: "auto",
                    }}
                  >
                    {empleadoSeleccionado.pagos.map((pg) => (
                      <div
                        key={
                          pg.id ?? `${pg.empleado_id}-${pg.fecha}-${pg.monto}`
                        }
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: "800",
                              fontSize: "0.84rem",
                              color: "#0f172a",
                            }}
                          >
                            {formatearFechaCorta(pg.fecha)}
                          </div>
                          {pg.observacion && (
                            <div
                              style={{
                                fontSize: "0.78rem",
                                color: "#475569",
                                marginTop: "2px",
                              }}
                            >
                              {pg.observacion}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            fontWeight: "900",
                            fontSize: "0.92rem",
                            color: "#15803d",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatearMoneda(pg.monto)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Nuevo Empleado */}
      {modalNuevoEmpleado &&
        createPortal(
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <button
                type="button"
                onClick={() => setModalNuevoEmpleado(false)}
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
                Nuevo Empleado
              </h3>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: "0.82rem",
                  color: "#64748b",
                }}
              >
                Se creará inicialmente en estado <strong>Activo</strong>.
              </p>

              {errorNuevoEmpleado && (
                <div style={styles.alertaError}>{errorNuevoEmpleado}</div>
              )}

              <form onSubmit={handleCrearEmpleado}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={styles.label}>Nombre completo *</label>
                  <input
                    type="text"
                    placeholder="Ej: Martín Gómez"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: 2266401234"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalNuevoEmpleado(false)}
                    style={styles.btnSecondary}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creandoEmpleado}
                    style={{
                      ...styles.btnPrimary,
                      opacity: creandoEmpleado ? 0.65 : 1,
                    }}
                  >
                    {creandoEmpleado ? "Guardando..." : "Crear empleado"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Confirmación antes de registrar pago */}
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
                  margin: "0 0 14px",
                  fontSize: "0.84rem",
                  color: "#475569",
                }}
              >
                Revisá los datos antes de confirmar:
              </p>

              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.86rem",
                  marginBottom: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div>
                  <strong>Empleado:</strong> {confirmacionPago.empleadoNombre}
                </div>
                <div>
                  <strong>Fecha:</strong>{" "}
                  {formatearFechaCorta(confirmacionPago.fecha)}
                </div>
                <div>
                  <strong>Monto:</strong>{" "}
                  <span style={{ color: "#15803d", fontWeight: "900" }}>
                    {formatearMoneda(confirmacionPago.monto)}
                  </span>
                </div>
                {confirmacionPago.observacion && (
                  <div>
                    <strong>Observación:</strong> {confirmacionPago.observacion}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                }}
              >
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
                    await ejecutarPagoConfirmado(datos);
                  }}
                  style={styles.btnSuccess}
                >
                  Sí, registrar pago
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
