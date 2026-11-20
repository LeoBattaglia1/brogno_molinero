const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const clienteId = req.query.cliente_id
      ? Number(req.query.cliente_id)
      : null;

    let sql = `
      SELECT c.id, c.cliente_id, cl.nombre AS cliente_nombre, c.nombre, c.distancia, c.creado_en
      FROM campos c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
    `;
    const params = [];

    if (clienteId && Number.isInteger(clienteId) && clienteId > 0) {
      sql += " WHERE c.cliente_id = ?";
      params.push(clienteId);
    }

    sql += " ORDER BY c.nombre ASC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function show(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de campo inválido" });
    }

    const [rows] = await pool.query(
      `SELECT c.id, c.cliente_id, cl.nombre AS cliente_nombre, c.nombre, c.distancia, c.creado_en
       FROM campos c
       LEFT JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Campo no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { cliente_id, nombre, distancia } = req.body;
    const clienteIdNum = Number(cliente_id);

    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!nombre || !nombre.trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del campo es obligatorio" });
    }

    const distanciaVal =
      distancia === "" || distancia === null || distancia === undefined
        ? null
        : Number(distancia);

    if (distanciaVal !== null && Number.isNaN(distanciaVal)) {
      return res
        .status(400)
        .json({ error: "La distancia debe ser un número válido" });
    }

    const [result] = await pool.query(
      "INSERT INTO campos (cliente_id, nombre, distancia) VALUES (?, ?, ?)",
      [clienteIdNum, nombre.trim(), distanciaVal],
    );

    const [rows] = await pool.query(
      "SELECT id, cliente_id, nombre, distancia, creado_en FROM campos WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "El cliente indicado no existe" });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { cliente_id, nombre, distancia } = req.body;
    const clienteIdNum = Number(cliente_id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de campo inválido" });
    }
    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!nombre || !nombre.trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del campo es obligatorio" });
    }

    const distanciaVal =
      distancia === "" || distancia === null || distancia === undefined
        ? null
        : Number(distancia);

    if (distanciaVal !== null && Number.isNaN(distanciaVal)) {
      return res
        .status(400)
        .json({ error: "La distancia debe ser un número válido" });
    }

    const [result] = await pool.query(
      "UPDATE campos SET cliente_id = ?, nombre = ?, distancia = ? WHERE id = ?",
      [clienteIdNum, nombre.trim(), distanciaVal, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Campo no encontrado" });
    }

    const [rows] = await pool.query(
      "SELECT id, cliente_id, nombre, distancia, creado_en FROM campos WHERE id = ?",
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "El cliente indicado no existe" });
    }
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de campo inválido" });
    }

    const [result] = await pool.query("DELETE FROM campos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Campo no encontrado" });
    }

    res.json({ mensaje: "Campo eliminado correctamente" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error:
          "No se puede eliminar el campo porque tiene molinos, trabajos o turnos asociados",
      });
    }
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
