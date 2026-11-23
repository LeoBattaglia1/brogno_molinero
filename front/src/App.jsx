import { useEffect, useState, useCallback, useMemo } from "react";
import "./App.css";
import api from "./api/api";
import AgregarTrabajo from "./modules/AgregarTrabajo";
import Clientes from "./modules/Clientes";
import Presupuestos from "./modules/Presupuestos";
import PagosCheques from "./modules/PagosCheques";

import Empleados from "./modules/Empleados";
import Turnos from "./modules/Turnos";
import Estadisticas from "./modules/Estadisticas";

const SECCIONES = [
  { id: "inicio", label: "Inicio" },
  { id: "agregar-trabajo", label: "Agregar trabajo" },
  { id: "clientes", label: "Clientes" },
  { id: "presupuestos", label: "Presupuestos" },
  { id: "pagos-cheques", label: "Pagos y Cheques" },

  { id: "empleados", label: "Empleados" },
  { id: "turnos", label: "Turnos" },
  { id: "estadisticas", label: "Estadísticas" },
];

const MODULOS = {
  "agregar-trabajo": AgregarTrabajo,
  clientes: Clientes,
  presupuestos: Presupuestos,
  "pagos-cheques": PagosCheques,

  empleados: Empleados,
  turnos: Turnos,
  estadisticas: Estadisticas,
};

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

function evaluarAlertaCheque(cheque) {
  const estado = String(cheque.estado || "pendiente").toLowerCase();
  if (estado === "cobrado" || estado === "rechazado") {
    return null;
  }

  const rawFecha = cheque.fecha_cobro || cheque.fecha_vencimiento;
  const fechaCobro = parseFechaLocal(rawFecha);
  const hoy = parseFechaLocal(hoyISO());
  const msPorDia = 1000 * 60 * 60 * 24;

  if (estado === "depositado") {
    const diasEnBanco = fechaCobro
      ? Math.max(0, Math.round((hoy - fechaCobro) / msPorDia))
      : 0;
    return {
      etapa: "depositado",
      mensaje:
        diasEnBanco > 0
          ? `Depositado hace ${diasEnBanco} ${diasEnBanco === 1 ? "día" : "días"} · Esperando acreditación`
          : "Depositado · Esperando acreditación",
    };
  }

  if (!fechaCobro) return null;

  const diasHastaCobro = Math.round((fechaCobro - hoy) / msPorDia);

  if (diasHastaCobro > 5) {
    return null;
  }

  if (diasHastaCobro > 0) {
    return {
      etapa: "proximo",
      mensaje: `Faltan ${diasHastaCobro} ${diasHastaCobro === 1 ? "día" : "días"} para poder depositarlo (${formatearFechaCorta(rawFecha)})`,
    };
  }

  if (diasHastaCobro === 0) {
    return {
      etapa: "listo_depositar",
      mensaje: `Habilitado hoy para depositar (${formatearFechaCorta(rawFecha)})`,
    };
  }

  return {
    etapa: "listo_depositar",
    mensaje: `Habilitado para depositar desde el ${formatearFechaCorta(rawFecha)}`,
  };
}

export default function App() {
  const [seccionActiva, setSeccionActiva] = useState("inicio");
  const [ahora, setAhora] = useState(() => new Date());

  const [cheques, setCheques] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [procesandoChequeId, setProcesandoChequeId] = useState(null);
  const [avisoCheque, setAvisoCheque] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cargarDatosAlertas = useCallback(async () => {
    try {
      const [resCheq, resCli] = await Promise.all([
        api.get("/cheques").catch(() => ({ data: [] })),
        api.get("/clientes").catch(() => ({ data: [] })),
      ]);
      setCheques(Array.isArray(resCheq.data) ? resCheq.data : []);
      setClientes(Array.isArray(resCli.data) ? resCli.data : []);
    } catch (err) {
      console.error("Error cargando alertas en Inicio:", err);
    }
  }, []);

  useEffect(() => {
    if (seccionActiva === "inicio") {
      cargarDatosAlertas();
    }
  }, [seccionActiva, cargarDatosAlertas]);

  const alertasCheques = useMemo(() => {
    const mapaCli = new Map(clientes.map((c) => [Number(c.id), c.nombre]));
    return cheques
      .map((ch) => {
        const alerta = evaluarAlertaCheque(ch);
        if (!alerta) return null;
        return {
          ...ch,
          clienteNombre:
            ch.cliente_nombre ||
            mapaCli.get(Number(ch.cliente_id)) ||
            `Cliente #${ch.cliente_id}`,
          alerta,
        };
      })
      .filter(Boolean);
  }, [cheques, clientes]);
  const handleCambiarEstadoCheque = async (chequeObj, nuevoEstado) => {
    setProcesandoChequeId(chequeObj.id);
    setAvisoCheque("");
    try {
      const fechaVencLimpia = chequeObj.fecha_vencimiento
        ? String(chequeObj.fecha_vencimiento).slice(0, 10)
        : chequeObj.fecha_cobro
          ? String(chequeObj.fecha_cobro).slice(0, 10)
          : null;

      const fechaResolucionNueva =
        nuevoEstado === "cobrado" || nuevoEstado === "rechazado"
          ? hoyISO()
          : null;

      try {
        await api.patch(`/cheques/${chequeObj.id}`, {
          estado: nuevoEstado,
          fecha_resolucion: fechaResolucionNueva,
        });
      } catch {
        await api.put(`/cheques/${chequeObj.id}`, {
          pago_id: chequeObj.pago_id ?? null,
          cliente_id: chequeObj.cliente_id,
          numero_cheque: chequeObj.numero_cheque,
          banco: chequeObj.banco,
          monto: chequeObj.monto,
          fecha_vencimiento: fechaVencLimpia,
          fecha_resolucion: fechaResolucionNueva,
          estado: nuevoEstado,
        });
      }

      setCheques((prev) =>
        prev.map((c) =>
          Number(c.id) === Number(chequeObj.id)
            ? {
                ...c,
                estado: nuevoEstado,
                fecha_resolucion: fechaResolucionNueva,
              }
            : c,
        ),
      );

      if (nuevoEstado === "rechazado") {
        setAvisoCheque(
          `Cheque #${chequeObj.numero_cheque} (${chequeObj.banco}) marcado como rechazado. Revisá el saldo del cliente.`,
        );
      }
    } catch (err) {
      console.error("Error actualizando estado de cheque:", err);
      setAvisoCheque(
        err.response?.data?.error ||
          "No se pudo actualizar el estado del cheque.",
      );
    } finally {
      setProcesandoChequeId(null);
    }
  };

  const horaFormateada = ahora.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const fechaFormateada = ahora.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleGuardarBD = () => {
    // Reservado para disparar el respaldo / guardado de la base de datos
  };

  const ModuloActual = MODULOS[seccionActiva];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="reloj-card">
          <div className="reloj-hora">{horaFormateada}</div>
          <div className="reloj-fecha">{fechaFormateada}</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {SECCIONES.map((sec) => {
            const activa = seccionActiva === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setSeccionActiva(sec.id)}
                className={`nav-btn ${activa ? "activa" : ""}`}
              >
                {sec.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer-action">
          <button
            type="button"
            onClick={handleGuardarBD}
            className="guardar-btn"
          >
            Guardar
          </button>
        </div>
      </aside>

      <main className="main-content">
        {seccionActiva === "inicio" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              maxWidth: "960px",
              gap: "16px",
            }}
          >
            <div className="alerta-placeholder">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.82rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: "800",
                    opacity: 0.85,
                  }}
                >
                  Alertas de Cheques ({alertasCheques.length})
                </span>
              </div>

              {avisoCheque && (
                <div
                  style={{
                    backgroundColor: "rgba(254, 242, 242, 0.95)",
                    color: "#991b1b",
                    border: "1px solid #fca5a5",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    marginBottom: "10px",
                  }}
                >
                  {avisoCheque}
                </div>
              )}

              {alertasCheques.length === 0 ? (
                <p
                  style={{
                    marginTop: "6px",
                    fontSize: "0.9rem",
                    opacity: 0.82,
                  }}
                >
                  No hay cheques próximos a depositar ni pendientes de
                  acreditación.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {alertasCheques.map((item) => {
                    const etapa = item.alerta.etapa;
                    const esDepositado = etapa === "depositado";
                    const esListo = etapa === "listo_depositar";
                    const ocupado = procesandoChequeId === item.id;

                    const fondoCard = esDepositado
                      ? "rgba(219, 234, 254, 0.96)"
                      : esListo
                        ? "rgba(220, 252, 231, 0.96)"
                        : "rgba(254, 243, 199, 0.96)";

                    const bordeCard = esDepositado
                      ? "#3b82f6"
                      : esListo
                        ? "#16a34a"
                        : "#d97706";

                    const colorTexto = esDepositado
                      ? "#1e3a8a"
                      : esListo
                        ? "#14532d"
                        : "#78350f";

                    return (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: fondoCard,
                          color: colorTexto,
                          border: `1.5px solid ${bordeCard}`,
                          borderLeft: `6px solid ${bordeCard}`,
                          borderRadius: "10px",
                          padding: "10px 12px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            gap: "8px",
                            fontWeight: "800",
                            fontSize: "0.88rem",
                          }}
                        >
                          <span>
                            {item.banco} · N° {item.numero_cheque} (
                            {item.clienteNombre})
                          </span>
                          <span style={{ fontWeight: "900" }}>
                            {formatearMoneda(item.monto)}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            marginTop: "4px",
                          }}
                        >
                          {item.alerta.mensaje}
                        </div>

                        {esListo && (
                          <div style={{ marginTop: "8px" }}>
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() =>
                                handleCambiarEstadoCheque(item, "depositado")
                              }
                              style={{
                                padding: "6px 12px",
                                borderRadius: "7px",
                                border: "none",
                                backgroundColor: "#15803d",
                                color: "#ffffff",
                                fontWeight: "800",
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                opacity: ocupado ? 0.65 : 1,
                              }}
                            >
                              {ocupado ? "Guardando..." : "Depositado"}
                            </button>
                          </div>
                        )}

                        {esDepositado && (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              marginTop: "8px",
                            }}
                          >
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() =>
                                handleCambiarEstadoCheque(item, "cobrado")
                              }
                              style={{
                                padding: "6px 12px",
                                borderRadius: "7px",
                                border: "none",
                                backgroundColor: "#166534",
                                color: "#ffffff",
                                fontWeight: "800",
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                opacity: ocupado ? 0.65 : 1,
                              }}
                            >
                              {ocupado ? "..." : "Cobrado"}
                            </button>

                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() =>
                                handleCambiarEstadoCheque(item, "rechazado")
                              }
                              style={{
                                padding: "6px 12px",
                                borderRadius: "7px",
                                border: "none",
                                backgroundColor: "#b91c1c",
                                color: "#ffffff",
                                fontWeight: "800",
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                opacity: ocupado ? 0.65 : 1,
                              }}
                            >
                              {ocupado ? "..." : "Rechazado"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="alerta-placeholder">
              <span
                style={{
                  fontSize: "0.82rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  opacity: 0.75,
                }}
              >
                Alertas de Turnos
              </span>
              <p
                style={{ marginTop: "6px", fontSize: "0.92rem", opacity: 0.85 }}
              >
                Espacio reservado para próximos turnos agendados.
              </p>
            </div>
          </div>
        )}

        {seccionActiva !== "inicio" && ModuloActual && (
          <div
            style={{
              maxWidth: "1100px",
              minHeight: "560px",
              background: "rgba(18, 16, 26, 0.72)",
              backdropFilter: "blur(8px)",
              padding: "22px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.16)",
            }}
          >
            <ModuloActual onActualizado={cargarDatosAlertas} />
          </div>
        )}
      </main>

      {seccionActiva === "inicio" && (
        <img
          src="/logo-brogno.png"
          alt="Logo LB"
          className="logo-marca"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}
