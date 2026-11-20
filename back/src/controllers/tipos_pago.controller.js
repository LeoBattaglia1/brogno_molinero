const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre FROM tipos_pago ORDER BY nombre ASC",
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function show(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de tipo de pago inválido" });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre FROM tipos_pago WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tipo de pago no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { nombre } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del tipo de pago es obligatorio" });
    }

    const [result] = await pool.query(
      "INSERT INTO tipos_pago (nombre) VALUES (?)",
      [String(nombre).trim()],
    );

    const [rows] = await pool.query(
      "SELECT id, nombre FROM tipos_pago WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe un tipo de pago con ese nombre" });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { nombre } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de tipo de pago inválido" });
    }
    if (!nombre || !String(nombre).trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del tipo de pago es obligatorio" });
    }

    const [result] = await pool.query(
      "UPDATE tipos_pago SET nombre = ? WHERE id = ?",
      [String(nombre).trim(), id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de pago no encontrado" });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre FROM tipos_pago WHERE id = ?",
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe un tipo de pago con ese nombre" });
    }
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de tipo de pago inválido" });
    }

    const [result] = await pool.query("DELETE FROM tipos_pago WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tipo de pago no encontrado" });
    }

    res.json({ mensaje: "Tipo de pago eliminado correctamente" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error:
          "No se puede eliminar el tipo de pago porque tiene pagos asociados",
      });
    }
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
