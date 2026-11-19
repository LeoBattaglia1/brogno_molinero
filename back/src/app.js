const express = require("express");
const cors = require("cors");

const clientesRoutes = require("./routes/clientes.routes");
const camposRoutes = require("./routes/campos.routes");
const molinosRoutes = require("./routes/molinos.routes");
const empleadosRoutes = require("./routes/empleados.routes");
const turnosRoutes = require("./routes/turnos.routes");
const trabajosRoutes = require("./routes/trabajos.routes");
const tiposPagoRoutes = require("./routes/tipos_pago.routes");
const pagosRoutes = require("./routes/pagos.routes");
const chequesRoutes = require("./routes/cheques.routes");
const empleadosPagosRoutes = require("./routes/empleados_pagos.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, proyecto: "Brogno Molinero" });
});

app.use("/api/clientes", clientesRoutes);
app.use("/api/campos", camposRoutes);
app.use("/api/molinos", molinosRoutes);
app.use("/api/empleados", empleadosRoutes);
app.use("/api/turnos", turnosRoutes);
app.use("/api/trabajos", trabajosRoutes);
app.use("/api/tipos-pago", tiposPagoRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/cheques", chequesRoutes);
app.use("/api/empleados-pagos", empleadosPagosRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Middleware centralizado de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;
