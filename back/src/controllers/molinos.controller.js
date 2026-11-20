const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const campoId = req.query.campo_id ? Number(req.query.campo_id) : null;

    let sql = `
      SELECT m.id, m.campo_id, ca.nombre AS campo_nombre, ca.cliente_id,
             m.nombre, m.maquina, m.cilindro, m.creado_en
      FROM molinos m
      LEFT JOIN campos ca ON ca.id = m.campo_id
    `;
    const params = [];

    if (campoId && Number.isInteger(campoId) && campoId > 0) {
      sql += " WHERE m.campo_id = ?";
      params.push(campoId);
    }

    sql += " ORDER BY m.nombre ASC";

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
      return res.status(400).json({ error: "ID de molino inválido" });
    }

    const [rows] = await pool.query(
      `SELECT m.id, m.campo_id, ca.nombre AS campo_nombre, ca.cliente_id,
              m.nombre, m.maquina, m.cilindro, m.creado_en
       FROM molinos m
       LEFT JOIN campos ca ON ca.id = m.campo_id
       WHERE m.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Molino no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { campo_id, nombre, maquina, cilindro } = req.body;
    const campoIdNum = Number(campo_id);

    if (!Number.isInteger(campoIdNum) || campoIdNum <= 0) {
      return res.status(400).json({ error: "El campo_id es obligatorio" });
    }
    if (!nombre || !nombre.trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del molino es obligatorio" });
    }

    const [result] = await pool.query(
      "INSERT INTO molinos (campo_id, nombre, maquina, cilindro) VALUES (?, ?, ?, ?)",
      [campoIdNum, nombre.trim(), maquina || null, cilindro || null],
    );

    const [rows] = await pool.query(
      "SELECT id, campo_id, nombre, maquina, cilindro, creado_en FROM molinos WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "El campo indicado no existe" });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { campo_id, nombre, maquina, cilindro } = req.body;
    const campoIdNum = Number(campo_id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de molino inválido" });
    }
    if (!Number.isInteger(campoIdNum) || campoIdNum <= 0) {
      return res.status(400).json({ error: "El campo_id es obligatorio" });
    }
    if (!nombre || !nombre.trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del molino es obligatorio" });
    }

    const [result] = await pool.query(
      "UPDATE molinos SET campo_id = ?, nombre = ?, maquina = ?, cilindro = ? WHERE id = ?",
      [campoIdNum, nombre.trim(), maquina || null, cilindro || null, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Molino no encontrado" });
    }

    const [rows] = await pool.query(
      "SELECT id, campo_id, nombre, maquina, cilindro, creado_en FROM molinos WHERE id = ?",
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "El campo indicado no existe" });
    }
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de molino inválido" });
    }

    const [result] = await pool.query("DELETE FROM molinos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Molino no encontrado" });
    }

    res.json({ mensaje: "Molino eliminado correctamente" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: "No se puede eliminar el molino porque tiene trabajos asociados",
      });
    }
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
