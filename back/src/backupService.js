const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const mysql = require("mysql2/promise");

const ESTADO_FILE = path.join(__dirname, "ultimo_respaldo.json");

// Busca automáticamente una unidad USB / Pendrive disponible en Windows
const encontrarUnidadPendrive = () => {
  const letras = [
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];

  for (const letra of letras) {
    const rutaUnidad = `${letra}:\\`;
    try {
      if (fs.existsSync(rutaUnidad)) {
        fs.readdirSync(rutaUnidad);
        // Verificar permiso de escritura creando y borrando un archivo temporal
        const prueba = path.join(rutaUnidad, `.tmp_write_${Date.now()}.txt`);
        fs.writeFileSync(prueba, "ok", "utf8");
        fs.unlinkSync(prueba);
        return rutaUnidad;
      }
    } catch {
      // Ignorar unidades no listas, de solo lectura o inaccesibles
    }
  }
  return null;
};

const escaparSQL = (val) => {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") {
    return Number.isFinite(val) ? String(val) : "NULL";
  }
  if (typeof val === "boolean") {
    return val ? "1" : "0";
  }
  if (val instanceof Date) {
    const iso = val.toISOString().slice(0, 19).replace("T", " ");
    return `'${iso}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString("hex")}'`;
  }
  if (typeof val === "object") {
    return `'${String(JSON.stringify(val))
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")}'`;
  }
  return `'${String(val)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")}'`;
};

const leerUltimoRespaldo = () => {
  try {
    if (fs.existsSync(ESTADO_FILE)) {
      const raw = fs.readFileSync(ESTADO_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {
    // Ignorar error de lectura de estado
  }
  return null;
};

const guardarUltimoRespaldo = (info) => {
  try {
    fs.writeFileSync(ESTADO_FILE, JSON.stringify(info, null, 2), "utf8");
  } catch {
    // Ignorar error de escritura de estado
  }
};

const generarRespaldoSQL = async () => {
  let conn = null;
  try {
    const unidadDetectada = encontrarUnidadPendrive();
    if (!unidadDetectada) {
      throw new Error(
        "No se detectó ningún pendrive o unidad USB con escritura disponible.",
      );
    }

    const dbName = process.env.DB_NAME || "defaultdb";
    const dbConfig = {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: dbName,
      ...(process.env.DB_SSL === "true"
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
    };

    conn = await mysql.createConnection(dbConfig);

    const [tablasRows] = await conn.query("SHOW FULL TABLES");
    const nombreColumnaTabla = Object.keys(tablasRows[0] || {})[0];

    const lineasSQL = [
      `-- Respaldo SQL generado automáticamente`,
      `-- Base de datos: \`${dbName}\``,
      `-- Fecha: ${new Date().toISOString()}`,
      `SET NAMES utf8mb4;`,
      `SET FOREIGN_KEY_CHECKS = 0;`,
      ``,
    ];

    for (const row of tablasRows) {
      const tabla = row[nombreColumnaTabla];
      const tipoObjeto = String(row.Table_type || "BASE TABLE").toUpperCase();
      if (!tabla) continue;

      if (tipoObjeto === "VIEW") {
        const [viewRows] = await conn.query(`SHOW CREATE VIEW \`${tabla}\``);
        const createViewSQL =
          viewRows[0]?.["Create View"] || Object.values(viewRows[0] || {})[1];
        if (createViewSQL) {
          lineasSQL.push(`DROP VIEW IF EXISTS \`${tabla}\`;`);
          lineasSQL.push(`${createViewSQL};`);
          lineasSQL.push(``);
        }
        continue;
      }

      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${tabla}\``);
      const createSQL =
        createRows[0]?.["Create Table"] ||
        Object.values(createRows[0] || {})[1];

      lineasSQL.push(`DROP TABLE IF EXISTS \`${tabla}\`;`);
      lineasSQL.push(`${createSQL};`);

      const [datosRows] = await conn.query(`SELECT * FROM \`${tabla}\``);
      if (Array.isArray(datosRows) && datosRows.length > 0) {
        const columnas = Object.keys(datosRows[0])
          .map((col) => `\`${col}\``)
          .join(", ");

        const tamLote = 100;
        for (let i = 0; i < datosRows.length; i += tamLote) {
          const lote = datosRows.slice(i, i + tamLote);
          const valoresSQL = lote
            .map(
              (r) =>
                `(${Object.values(r)
                  .map((v) => escaparSQL(v))
                  .join(", ")})`,
            )
            .join(",\n  ");
          lineasSQL.push(
            `INSERT INTO \`${tabla}\` (${columnas}) VALUES\n  ${valoresSQL};`,
          );
        }
      }
      lineasSQL.push(``);
    }

    lineasSQL.push(`SET FOREIGN_KEY_CHECKS = 1;`);

    const nombreArchivo = `respaldo_${dbName}.sql`;
    const rutaDestino = path.join(unidadDetectada, nombreArchivo);
    fs.writeFileSync(rutaDestino, lineasSQL.join("\n"), "utf8");

    if (!fs.existsSync(rutaDestino)) {
      throw new Error(
        `No se pudo escribir el archivo en la unidad ${unidadDetectada}.`,
      );
    }

    const fechaExitoISO = new Date().toISOString();
    const infoExito = {
      success: true,
      path: rutaDestino,
      archivo: nombreArchivo,
      unidad: unidadDetectada,
      fechaExitoISO,
    };
    guardarUltimoRespaldo(infoExito);

    return infoExito;
  } catch (error) {
    console.error("Error al generar el respaldo en pendrive:", error.message);
    return {
      success: false,
      error: error.message,
      ultimoRespaldo: leerUltimoRespaldo(),
    };
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
};

const iniciarProgramadorDeRespaldos = (expresionCron = null) => {
  const cronExpr =
    expresionCron || process.env.BACKUP_CRON || "0 10,12,16,18,20 * * *";

  cron.schedule(cronExpr, async () => {
    console.log("Ejecutando respaldo automático en pendrive...");
    const resultado = await generarRespaldoSQL();
    if (resultado.success) {
      console.log(`Respaldo actualizado con éxito en: ${resultado.path}`);
    } else {
      console.warn(`Respaldo automático no realizado: ${resultado.error}`);
    }
  });
};

module.exports = {
  generarRespaldoSQL,
  iniciarProgramadorDeRespaldos,
  leerUltimoRespaldo,
};
