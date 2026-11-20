const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const empleadoId = req.query.empleado_id
      ? Number(req.query.empleado_id)
      : null;

    let sql = `
      SELECT ep.id, ep.empleado_id, e.nombre AS empleado_nombre,
             ep.fecha, ep.monto, ep.observacion, ep.creado_en
      FROM empleados_pagos ep
      LEFT JOIN empleados e ON e.id = ep.empleado_id
      WHERE 1=1
    `;
    const params = [];

    if (empleadoId && Number.isInteger(empleadoId) && empleadoId > 0) {
      sql += " AND ep.empleado_id = ?";
      params.push(empleadoId);
    }

    sql += " ORDER BY ep.fecha DESC, ep.id DESC";

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
      return res.status(400).json({ error: "ID de pago de empleado inválido" });
    }

    const [rows] = await pool.query(
      `SELECT ep.id, ep.empleado_id, e.nombre AS empleado_nombre,
              ep.fecha, ep.monto, ep.observacion, ep.creado_en
       FROM empleados_pagos ep
       LEFT JOIN empleados e ON e.id = ep.empleado_id
       WHERE ep.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pago de empleado no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { empleado_id, fecha, monto, observacion } = req.body;
    const empleadoIdNum = Number(empleado_id);
    const montoNum = Number(monto);

    if (!Number.isInteger(empleadoIdNum) || empleadoIdNum <= 0) {
      return res.status(400).json({ error: "El empleado_id es obligatorio" });
    }
    if (!fecha || !String(fecha).trim()) {
      return res.status(400).json({ error: "La fecha es obligatoria" });
    }
    if (
      monto === undefined ||
      monto === null ||
      monto === "" ||
      Number.isNaN(montoNum)
    ) {
      return res
        .status(400)
        .json({ error: "El monto es obligatorio y debe ser numérico" });
    }

    const [result] = await pool.query(
      `INSERT INTO empleados_pagos (empleado_id, fecha, monto, observacion)
       VALUES (?, ?, ?, ?)`,
      [empleadoIdNum, String(fecha).trim(), montoNum, observacion || null],
    );

    const [rows] = await pool.query(
      `SELECT id, empleado_id, fecha, monto, observacion, creado_en
       FROM empleados_pagos WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "El empleado indicado no existe" });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { empleado_id, fecha, monto, observacion } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de pago de empleado inválido" });
    }

    const empleadoIdNum = Number(empleado_id);
    const montoNum = Number(monto);

    if (!Number.isInteger(empleadoIdNum) || empleadoIdNum <= 0) {
      return res.status(400).json({ error: "El empleado_id es obligatorio" });
    }
    if (!fecha || !String(fecha).trim()) {
      return res.status(400).json({ error: "La fecha es obligatoria" });
    }
    if (
      monto === undefined ||
      monto === null ||
      monto === "" ||
      Number.isNaN(montoNum)
    ) {
      return res
        .status(400)
        .json({ error: "El monto es obligatorio y debe ser numérico" });
    }

    const [result] = await pool.query(
      `UPDATE empleados_pagos
       SET empleado_id = ?, fecha = ?, monto = ?, observacion = ?
       WHERE id = ?`,
      [empleadoIdNum, String(fecha).trim(), montoNum, observacion || null, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pago de empleado no encontrado" });
    }

    const [rows] = await pool.query(
      `SELECT id, empleado_id, fecha, monto, observacion, creado_en
       FROM empleados_pagos WHERE id = ?`,
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "El empleado indicado no existe" });
    }
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de pago de empleado inválido" });
    }

    const [result] = await pool.query(
      "DELETE FROM empleados_pagos WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pago de empleado no encontrado" });
    }

    res.json({ mensaje: "Pago de empleado eliminado correctamente" });
  } catch (error) {
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
