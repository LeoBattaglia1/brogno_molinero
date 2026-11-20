const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const clienteId = req.query.cliente_id
      ? Number(req.query.cliente_id)
      : null;
    const campoId = req.query.campo_id ? Number(req.query.campo_id) : null;
    const molinoId = req.query.molino_id ? Number(req.query.molino_id) : null;

    let sql = `
      SELECT t.id, t.cliente_id, cl.nombre AS cliente_nombre,
             t.campo_id, ca.nombre AS campo_nombre,
             t.molino_id, m.nombre AS molino_nombre,
             t.fecha, t.descripcion, t.monto, t.creado_en
      FROM trabajos t
      LEFT JOIN clientes cl ON cl.id = t.cliente_id
      LEFT JOIN campos ca ON ca.id = t.campo_id
      LEFT JOIN molinos m ON m.id = t.molino_id
      WHERE 1=1
    `;
    const params = [];

    if (clienteId && Number.isInteger(clienteId) && clienteId > 0) {
      sql += " AND t.cliente_id = ?";
      params.push(clienteId);
    }
    if (campoId && Number.isInteger(campoId) && campoId > 0) {
      sql += " AND t.campo_id = ?";
      params.push(campoId);
    }
    if (molinoId && Number.isInteger(molinoId) && molinoId > 0) {
      sql += " AND t.molino_id = ?";
      params.push(molinoId);
    }

    sql += " ORDER BY t.fecha DESC, t.id DESC";

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
      return res.status(400).json({ error: "ID de trabajo inválido" });
    }

    const [rows] = await pool.query(
      `SELECT t.id, t.cliente_id, cl.nombre AS cliente_nombre,
              t.campo_id, ca.nombre AS campo_nombre,
              t.molino_id, m.nombre AS molino_nombre,
              t.fecha, t.descripcion, t.monto, t.creado_en
       FROM trabajos t
       LEFT JOIN clientes cl ON cl.id = t.cliente_id
       LEFT JOIN campos ca ON ca.id = t.campo_id
       LEFT JOIN molinos m ON m.id = t.molino_id
       WHERE t.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Trabajo no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { cliente_id, campo_id, molino_id, fecha, descripcion, monto } =
      req.body;

    const clienteIdNum = Number(cliente_id);
    const campoIdNum = Number(campo_id);
    const molinoIdNum =
      molino_id === "" || molino_id === null || molino_id === undefined
        ? null
        : Number(molino_id);
    const montoNum = Number(monto);

    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!Number.isInteger(campoIdNum) || campoIdNum <= 0) {
      return res.status(400).json({ error: "El campo_id es obligatorio" });
    }
    if (
      molinoIdNum !== null &&
      (!Number.isInteger(molinoIdNum) || molinoIdNum <= 0)
    ) {
      return res.status(400).json({ error: "El molino_id es inválido" });
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
      `INSERT INTO trabajos (cliente_id, campo_id, molino_id, fecha, descripcion, monto)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        clienteIdNum,
        campoIdNum,
        molinoIdNum,
        String(fecha).trim(),
        descripcion || null,
        montoNum,
      ],
    );

    const [rows] = await pool.query(
      `SELECT id, cliente_id, campo_id, molino_id, fecha, descripcion, monto, creado_en
       FROM trabajos WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ error: "El cliente, campo o molino indicado no existe" });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { cliente_id, campo_id, molino_id, fecha, descripcion, monto } =
      req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de trabajo inválido" });
    }

    const clienteIdNum = Number(cliente_id);
    const campoIdNum = Number(campo_id);
    const molinoIdNum =
      molino_id === "" || molino_id === null || molino_id === undefined
        ? null
        : Number(molino_id);
    const montoNum = Number(monto);

    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!Number.isInteger(campoIdNum) || campoIdNum <= 0) {
      return res.status(400).json({ error: "El campo_id es obligatorio" });
    }
    if (
      molinoIdNum !== null &&
      (!Number.isInteger(molinoIdNum) || molinoIdNum <= 0)
    ) {
      return res.status(400).json({ error: "El molino_id es inválido" });
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
      `UPDATE trabajos
       SET cliente_id = ?, campo_id = ?, molino_id = ?, fecha = ?, descripcion = ?, monto = ?
       WHERE id = ?`,
      [
        clienteIdNum,
        campoIdNum,
        molinoIdNum,
        String(fecha).trim(),
        descripcion || null,
        montoNum,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Trabajo no encontrado" });
    }

    const [rows] = await pool.query(
      `SELECT id, cliente_id, campo_id, molino_id, fecha, descripcion, monto, creado_en
       FROM trabajos WHERE id = ?`,
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ error: "El cliente, campo o molino indicado no existe" });
    }
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de trabajo inválido" });
    }

    const [result] = await pool.query("DELETE FROM trabajos WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Trabajo no encontrado" });
    }

    res.json({ mensaje: "Trabajo eliminado correctamente" });
  } catch (error) {
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
