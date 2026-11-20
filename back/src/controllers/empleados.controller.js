const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const soloActivos =
      req.query.activo !== undefined ? Number(req.query.activo) : null;

    let sql =
      "SELECT id, nombre, telefono, activo, creado_en FROM empleados WHERE 1=1";
    const params = [];

    if (soloActivos === 0 || soloActivos === 1) {
      sql += " AND activo = ?";
      params.push(soloActivos);
    }

    sql += " ORDER BY nombre ASC";

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
      return res.status(400).json({ error: "ID de empleado inválido" });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre, telefono, activo, creado_en FROM empleados WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { nombre, telefono, activo } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del empleado es obligatorio" });
    }

    const activoVal =
      activo === undefined || activo === null ? 1 : Number(activo) ? 1 : 0;

    const [result] = await pool.query(
      "INSERT INTO empleados (nombre, telefono, activo) VALUES (?, ?, ?)",
      [String(nombre).trim(), telefono || null, activoVal],
    );

    const [rows] = await pool.query(
      "SELECT id, nombre, telefono, activo, creado_en FROM empleados WHERE id = ?",
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
    const { nombre, telefono, activo } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de empleado inválido" });
    }
    if (!nombre || !String(nombre).trim()) {
      return res
        .status(400)
        .json({ error: "El nombre del empleado es obligatorio" });
    }

    const activoVal =
      activo === undefined || activo === null ? 1 : Number(activo) ? 1 : 0;

    const [result] = await pool.query(
      "UPDATE empleados SET nombre = ?, telefono = ?, activo = ? WHERE id = ?",
      [String(nombre).trim(), telefono || null, activoVal, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre, telefono, activo, creado_en FROM empleados WHERE id = ?",
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
      return res.status(400).json({ error: "ID de empleado inválido" });
    }

    const [result] = await pool.query("DELETE FROM empleados WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    res.json({ mensaje: "Empleado eliminado correctamente" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: "No se puede eliminar el empleado porque tiene pagos asociados",
      });
    }
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
