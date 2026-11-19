const app = require("./app");
const { probarConexion } = require("./config/db");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    await probarConexion();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(
      "No se pudo iniciar el servidor por error de base de datos:",
      error.message,
    );
    process.exit(1);
  }
}

iniciarServidor();
