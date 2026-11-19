const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, cuit, telefono, creado_en FROM clientes ORDER BY nombre ASC",
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
      return res.status(400).json({ error: "ID de cliente inválido" });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre, cuit, telefono, creado_en FROM clientes WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { nombre, cuit, telefono } = req.body;
    if (!nombre || !nombre.trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del cliente es obligatorio" });
    }

    const [result] = await pool.query(
      "INSERT INTO clientes (nombre, cuit, telefono) VALUES (?, ?, ?)",
      [nombre.trim(), cuit || null, telefono || null],
    );

    const [rows] = await pool.query(
      "SELECT id, nombre, cuit, telefono, creado_en FROM clientes WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { nombre, cuit, telefono } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de cliente inválido" });
    }
    if (!nombre || !nombre.trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del cliente es obligatorio" });
    }

    const [result] = await pool.query(
      "UPDATE clientes SET nombre = ?, cuit = ?, telefono = ? WHERE id = ?",
      [nombre.trim(), cuit || null, telefono || null, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre, cuit, telefono, creado_en FROM clientes WHERE id = ?",
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de cliente inválido" });
    }

    const [result] = await pool.query("DELETE FROM clientes WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json({ mensaje: "Cliente eliminado correctamente" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error:
          "No se puede eliminar el cliente porque tiene campos, turnos, trabajos o pagos asociados",
      });
    }
    next(error);
  }
}

module.exports = {
  index,
  show,
  store,
  update,
  destroy,
};
