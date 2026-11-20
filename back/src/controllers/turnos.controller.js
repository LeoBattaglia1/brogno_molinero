const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const clienteId = req.query.cliente_id
      ? Number(req.query.cliente_id)
      : null;
    const campoId = req.query.campo_id ? Number(req.query.campo_id) : null;

    let sql = `
      SELECT tu.id, tu.cliente_id, cl.nombre AS cliente_nombre,
             tu.campo_id, ca.nombre AS campo_nombre,
             tu.fecha_hora, tu.observacion, tu.creado_en
      FROM turnos tu
      LEFT JOIN clientes cl ON cl.id = tu.cliente_id
      LEFT JOIN campos ca ON ca.id = tu.campo_id
      WHERE 1=1
    `;
    const params = [];

    if (clienteId && Number.isInteger(clienteId) && clienteId > 0) {
      sql += " AND tu.cliente_id = ?";
      params.push(clienteId);
    }
    if (campoId && Number.isInteger(campoId) && campoId > 0) {
      sql += " AND tu.campo_id = ?";
      params.push(campoId);
    }

    sql += " ORDER BY tu.fecha_hora ASC";

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
      return res.status(400).json({ error: "ID de turno inválido" });
    }

    const [rows] = await pool.query(
      `SELECT tu.id, tu.cliente_id, cl.nombre AS cliente_nombre,
              tu.campo_id, ca.nombre AS campo_nombre,
              tu.fecha_hora, tu.observacion, tu.creado_en
       FROM turnos tu
       LEFT JOIN clientes cl ON cl.id = tu.cliente_id
       LEFT JOIN campos ca ON ca.id = tu.campo_id
       WHERE tu.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { cliente_id, campo_id, fecha_hora, observacion } = req.body;
    const clienteIdNum = Number(cliente_id);
    const campoIdNum = Number(campo_id);

    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!Number.isInteger(campoIdNum) || campoIdNum <= 0) {
      return res.status(400).json({ error: "El campo_id es obligatorio" });
    }
    if (!fecha_hora || !String(fecha_hora).trim()) {
      return res.status(400).json({ error: "La fecha y hora es obligatoria" });
    }

    const [result] = await pool.query(
      `INSERT INTO turnos (cliente_id, campo_id, fecha_hora, observacion)
       VALUES (?, ?, ?, ?)`,
      [
        clienteIdNum,
        campoIdNum,
        String(fecha_hora).trim(),
        observacion || null,
      ],
    );

    const [rows] = await pool.query(
      `SELECT id, cliente_id, campo_id, fecha_hora, observacion, creado_en
       FROM turnos WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ error: "El cliente o campo indicado no existe" });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { cliente_id, campo_id, fecha_hora, observacion } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de turno inválido" });
    }

    const clienteIdNum = Number(cliente_id);
    const campoIdNum = Number(campo_id);

    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!Number.isInteger(campoIdNum) || campoIdNum <= 0) {
      return res.status(400).json({ error: "El campo_id es obligatorio" });
    }
    if (!fecha_hora || !String(fecha_hora).trim()) {
      return res.status(400).json({ error: "La fecha y hora es obligatoria" });
    }

    const [result] = await pool.query(
      `UPDATE turnos
       SET cliente_id = ?, campo_id = ?, fecha_hora = ?, observacion = ?
       WHERE id = ?`,
      [
        clienteIdNum,
        campoIdNum,
        String(fecha_hora).trim(),
        observacion || null,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    const [rows] = await pool.query(
      `SELECT id, cliente_id, campo_id, fecha_hora, observacion, creado_en
       FROM turnos WHERE id = ?`,
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ error: "El cliente o campo indicado no existe" });
    }
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de turno inválido" });
    }

    const [result] = await pool.query("DELETE FROM turnos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    res.json({ mensaje: "Turno eliminado correctamente" });
  } catch (error) {
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
