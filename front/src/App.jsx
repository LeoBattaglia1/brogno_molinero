import { useEffect, useState } from "react";
import "./App.css";
import AgregarTrabajo from "./modules/AgregarTrabajo";
import Clientes from "./modules/Clientes";
import Presupuestos from "./modules/Presupuestos";
import PagosCheques from "./modules/PagosCheques";
import Caja from "./modules/Caja";
import Empleados from "./modules/Empleados";
import Turnos from "./modules/Turnos";
import Estadisticas from "./modules/Estadisticas";

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

const MODULOS = {
  "agregar-trabajo": AgregarTrabajo,
  clientes: Clientes,
  presupuestos: Presupuestos,
  "pagos-cheques": PagosCheques,
  caja: Caja,
  empleados: Empleados,
  turnos: Turnos,
  estadisticas: Estadisticas,
};

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

        {seccionActiva !== "inicio" && ModuloActual && (
          <div
            style={{
              maxWidth: "1100px",
              minHeight: "560px", // <-- Probá subiendo o bajando este valor (ej: "540px", "600px", "75vh")
              background: "rgba(18, 16, 26, 0.72)",
              backdropFilter: "blur(8px)",
              padding: "22px",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.16)",
            }}
          >
            <ModuloActual />
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
