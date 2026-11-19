import { useEffect, useState } from "react";
import "./App.css";

const SECCIONES = [
  { id: "inicio", label: "Inicio" },
  { id: "agregar-trabajo", label: "Agregar trabajo" },
  { id: "clientes", label: "Clientes" },
  { id: "presupuestos", label: "Presupuestos" },
  { id: "pagos-cheques", label: "Pagos y Cheques" },
  { id: "caja", label: "Caja" },
  { id: "empleados", label: "Empleados" },
  { id: "turnos", label: "Turnos" },
  { id: "estadisticas", label: "Estadísticas" },
];

export default function App() {
  const [seccionActiva, setSeccionActiva] = useState("inicio");
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              maxWidth: "860px",
              gap: "16px",
            }}
          >
            <div className="alerta-placeholder">
              <span
                style={{
                  fontSize: "0.82rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  opacity: 0.75,
                }}
              >
                Alertas de Cheques
              </span>
              <p
                style={{ marginTop: "6px", fontSize: "0.92rem", opacity: 0.85 }}
              >
                Espacio reservado para cheques próximos a vencer o a cobrar.
              </p>
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

        {seccionActiva !== "inicio" && (
          <div
            style={{
              maxWidth: "960px",
              background: "rgba(16, 26, 21, 0.72)",
              backdropFilter: "blur(8px)",
              padding: "22px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.16)",
            }}
          >
            <p style={{ margin: 0, opacity: 0.9 }}>
              Contenido del módulo listo para desarrollar.
            </p>
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
