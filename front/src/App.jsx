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

function formatearFechaHoraGuardado(isoOrDate) {
  if (!isoOrDate) return "Aún no se realizó ningún guardado exitoso.";
  const dt = new Date(isoOrDate);
  if (Number.isNaN(dt.getTime())) return String(isoOrDate);
  const fecha = dt.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = dt.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `Último guardado exitoso: ${fecha} a las ${hora}`;
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

function formatearDiasTexto(dias) {
  if (dias === 0) return "hoy";
  if (dias === 1) return "1 día";
  return `${dias} días`;
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

  if (diasHastaCobro > 3) {
    return null;
  }

  if (diasHastaCobro > 0) {
    return {
      etapa: "proximo",
      mensaje: `Vence en ${diasHastaCobro} ${diasHastaCobro === 1 ? "día" : "días"} (${formatearFechaCorta(rawFecha)})`,
    };
  }

  if (diasHastaCobro === 0) {
    return {
      etapa: "listo_depositar",
      mensaje: `Vence hoy (${formatearFechaCorta(rawFecha)})`,
    };
  }

  return {
    etapa: "listo_depositar",
    mensaje: `Habilitado desde el ${formatearFechaCorta(rawFecha)}`,
  };
}

export default function App() {
  const [seccionActiva, setSeccionActiva] = useState("inicio");
  const [ahora, setAhora] = useState(() => new Date());

  const [cheques, setCheques] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [procesandoChequeId, setProcesandoChequeId] = useState(null);
  const [confirmacionCheque, setConfirmacionCheque] = useState(null);

  const [guardandoRespaldo, setGuardandoRespaldo] = useState(false);
  const [ultimoGuardadoISO, setUltimoGuardadoISO] = useState(() => {
    try {
      return localStorage.getItem("ultimo_guardado_bd_iso") || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelado = false;
    api
      .get("/backup/ultimo")
      .then((res) => {
        if (cancelado) return;
        const iso = res?.data?.ultimoRespaldo?.fechaExitoISO;
        if (iso) {
          setUltimoGuardadoISO(iso);
          try {
            localStorage.setItem("ultimo_guardado_bd_iso", iso);
          } catch {
            // Ignorar storage no disponible
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const cargarDatosAlertas = useCallback(async () => {
    try {
      const [resCheq, resTurnos, resCli] = await Promise.all([
        api.get("/cheques").catch(() => ({ data: [] })),
        api.get("/turnos").catch(() => ({ data: [] })),
        api.get("/clientes").catch(() => ({ data: [] })),
      ]);
      setCheques(Array.isArray(resCheq.data) ? resCheq.data : []);
      setTurnos(Array.isArray(resTurnos.data) ? resTurnos.data : []);
      setClientes(Array.isArray(resCli.data) ? resCli.data : []);
    } catch (err) {
      console.error("Error cargando alertas en Inicio:", err);
    }
  }, []);

  useEffect(() => {
    if (seccionActiva !== "inicio") return;

    let cancelado = false;

    async function cargar() {
      try {
        const [resCheq, resTurnos, resCli] = await Promise.all([
          api.get("/cheques").catch(() => ({ data: [] })),
          api.get("/turnos").catch(() => ({ data: [] })),
          api.get("/clientes").catch(() => ({ data: [] })),
        ]);
        if (cancelado) return;
        setCheques(Array.isArray(resCheq.data) ? resCheq.data : []);
        setTurnos(Array.isArray(resTurnos.data) ? resTurnos.data : []);
        setClientes(Array.isArray(resCli.data) ? resCli.data : []);
      } catch (err) {
        if (!cancelado) {
          console.error("Error cargando alertas en Inicio:", err);
        }
      }
    }

    cargar();

    return () => {
      cancelado = true;
    };
  }, [seccionActiva]);

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

  const turnosProximos = useMemo(() => {
    const hoy = parseFechaLocal(hoyISO());
    const msPorDia = 1000 * 60 * 60 * 24;
    const mapaCli = new Map(clientes.map((c) => [Number(c.id), c.nombre]));

    return turnos
      .map((t) => {
        const fechaTurno = parseFechaLocal(t.fecha_hora || t.fecha);
        if (!fechaTurno || !hoy) return null;
        const diasHastaTurno = Math.round((fechaTurno - hoy) / msPorDia);
        if (diasHastaTurno < 0 || diasHastaTurno > 2) return null;
        return {
          ...t,
          diasHastaTurno,
          clienteNombre:
            t.cliente_nombre ||
            mapaCli.get(Number(t.cliente_id)) ||
            `Cliente #${t.cliente_id}`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.diasHastaTurno - b.diasHastaTurno);
  }, [turnos, clientes]);

  const handleCambiarEstadoCheque = async (chequeObj, nuevoEstado) => {
    setProcesandoChequeId(chequeObj.id);
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
    } catch (err) {
      console.error("Error actualizando estado de cheque:", err);
    } finally {
      setProcesandoChequeId(null);
    }
  };

  const solicitarConfirmacionEstado = (chequeObj, nuevoEstado) => {
    setConfirmacionCheque({ cheque: chequeObj, nuevoEstado });
  };

  const confirmarCambioEstadoCheque = async () => {
    if (!confirmacionCheque) return;
    const { cheque, nuevoEstado } = confirmacionCheque;
    setConfirmacionCheque(null);
    await handleCambiarEstadoCheque(cheque, nuevoEstado);
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

  const handleGuardarBD = async () => {
    setGuardandoRespaldo(true);
    try {
      const res = await api.post("/backup");
      const data = res?.data || {};
      if (data.success) {
        const iso = data.fechaExitoISO || new Date().toISOString();
        setUltimoGuardadoISO(iso);
        try {
          localStorage.setItem("ultimo_guardado_bd_iso", iso);
        } catch {
          // Ignorar storage no disponible
        }
      }
    } catch {
      // Error manejado silenciosamente en la UI del botón
    } finally {
      setGuardandoRespaldo(false);
    }
  };

  const ModuloActual = MODULOS[seccionActiva];
  const primerTurno = turnosProximos[0] || null;

  return (
    <div
      className="app-shell"
      style={{
        display: "flex",
        alignItems: "flex-start",
        minHeight: "100vh",
      }}
    >
      <aside
        className="sidebar"
        style={{
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
          flexShrink: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
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

          <hr
            style={{
              width: "100%",
              border: "none",
              borderTop: "1px solid rgba(148, 163, 184, 0.35)",
              margin: "10px 0",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <button
              type="button"
              disabled={guardandoRespaldo}
              onClick={handleGuardarBD}
              className="guardar-btn"
              style={{ opacity: guardandoRespaldo ? 0.65 : 1 }}
            >
              {guardandoRespaldo ? "Guardando..." : "Guardar"}
            </button>

            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                lineHeight: 1.35,
                color: "#cbd5e1",
              }}
            >
              {formatearFechaHoraGuardado(ultimoGuardadoISO)}
            </p>
          </div>
        </nav>
      </aside>

      <main
        className="main-content"
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {seccionActiva === "inicio" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxWidth: "480px",
            }}
          >
            {primerTurno && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "11px 16px",
                  borderRadius: "9px",
                  backgroundColor: "rgba(243, 232, 255, 0.97)",
                  border: "1px solid #a855f7",
                  borderLeft: "5px solid #7e22ce",
                  color: "#3b0764",
                  fontSize: "0.84rem",
                  fontWeight: "600",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.14)",
                }}
              >
                <span>
                  {turnosProximos.length === 1
                    ? `Hay un turno próximo en ${formatearDiasTexto(primerTurno.diasHastaTurno)}.`
                    : `Hay ${turnosProximos.length} turnos próximos (el próximo en ${formatearDiasTexto(primerTurno.diasHastaTurno)}).`}
                </span>
                <button
                  type="button"
                  onClick={() => setSeccionActiva("turnos")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#6b21a8",
                    fontWeight: "800",
                    fontSize: "0.84rem",
                    textDecoration: "underline",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Ir a Turnos →
                </button>
              </div>
            )}

            {alertasCheques.map((item) => {
              const etapa = item.alerta.etapa;
              const esDepositado = etapa === "depositado";
              const esListo = etapa === "listo_depositar";
              const ocupado = procesandoChequeId === item.id;

              const fondoCard = esDepositado
                ? "rgba(241, 245, 249, 0.97)"
                : esListo
                  ? "rgba(220, 252, 231, 0.96)"
                  : "rgba(254, 243, 199, 0.96)";

              const bordeCard = esDepositado
                ? "#475569"
                : esListo
                  ? "#16a34a"
                  : "#d97706";

              const colorTexto = esDepositado
                ? "#0f172a"
                : esListo
                  ? "#14532d"
                  : "#78350f";

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: fondoCard,
                    color: colorTexto,
                    border: `1px solid ${bordeCard}`,
                    borderLeft: `4px solid ${bordeCard}`,
                    borderRadius: "8px",
                    padding: "9px 13px",
                    fontSize: "0.82rem",
                    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      fontWeight: "700",
                    }}
                  >
                    <span>
                      {item.banco} · N° {item.numero_cheque} (
                      {item.clienteNombre})
                    </span>
                    <span style={{ fontWeight: "800", whiteSpace: "nowrap" }}>
                      {formatearMoneda(item.monto)}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: "600",
                      marginTop: "3px",
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
                          padding: "5px 12px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "#15803d",
                          color: "#ffffff",
                          fontWeight: "700",
                          fontSize: "0.76rem",
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
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "20px",
                        marginTop: "9px",
                        paddingTop: "6px",
                        borderTop: "1px solid rgba(15, 23, 42, 0.1)",
                      }}
                    >
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() =>
                          solicitarConfirmacionEstado(item, "cobrado")
                        }
                        style={{
                          padding: "5px 12px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "#166534",
                          color: "#ffffff",
                          fontWeight: "700",
                          fontSize: "0.76rem",
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
                          solicitarConfirmacionEstado(item, "rechazado")
                        }
                        style={{
                          padding: "5px 12px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "#b91c1c",
                          color: "#ffffff",
                          fontWeight: "700",
                          fontSize: "0.76rem",
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

      {confirmacionCheque && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              color: "#0f172a",
              borderRadius: "10px",
              padding: "20px 22px",
              maxWidth: "380px",
              width: "100%",
              boxShadow: "0 14px 30px rgba(15, 23, 42, 0.25)",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "1.05rem",
                fontWeight: "800",
                color: "#0f172a",
              }}
            >
              ¿Estás seguro?
            </h3>
            <p
              style={{
                margin: "0 0 18px 0",
                fontSize: "0.88rem",
                color: "#334155",
                lineHeight: 1.4,
              }}
            >
              Vas a marcar el cheque N°{" "}
              <strong>{confirmacionCheque.cheque.numero_cheque}</strong> (
              {confirmacionCheque.cheque.banco}) como{" "}
              <strong>
                {confirmacionCheque.nuevoEstado === "cobrado"
                  ? "COBRADO"
                  : "RECHAZADO"}
              </strong>
              .
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmacionCheque(null)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "7px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f1f5f9",
                  color: "#1e293b",
                  fontWeight: "700",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarCambioEstadoCheque}
                style={{
                  padding: "7px 14px",
                  borderRadius: "7px",
                  border: "none",
                  backgroundColor:
                    confirmacionCheque.nuevoEstado === "cobrado"
                      ? "#166534"
                      : "#b91c1c",
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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
