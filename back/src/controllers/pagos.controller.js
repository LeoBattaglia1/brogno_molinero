const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    const clienteId = req.query.cliente_id
      ? Number(req.query.cliente_id)
      : null;
    const tipoPagoId = req.query.tipo_pago_id
      ? Number(req.query.tipo_pago_id)
      : null;

    let sql = `
      SELECT p.id, p.cliente_id, cl.nombre AS cliente_nombre,
             p.tipo_pago_id, tp.nombre AS tipo_pago_nombre,
             p.fecha, p.monto, p.observacion, p.creado_en
      FROM pagos p
      LEFT JOIN clientes cl ON cl.id = p.cliente_id
      LEFT JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
      WHERE 1=1
    `;
    const params = [];

    if (clienteId && Number.isInteger(clienteId) && clienteId > 0) {
      sql += " AND p.cliente_id = ?";
      params.push(clienteId);
    }
    if (tipoPagoId && Number.isInteger(tipoPagoId) && tipoPagoId > 0) {
      sql += " AND p.tipo_pago_id = ?";
      params.push(tipoPagoId);
    }

    sql += " ORDER BY p.fecha DESC, p.id DESC";

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
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.cliente_id, cl.nombre AS cliente_nombre,
              p.tipo_pago_id, tp.nombre AS tipo_pago_nombre,
              p.fecha, p.monto, p.observacion, p.creado_en
       FROM pagos p
       LEFT JOIN clientes cl ON cl.id = p.cliente_id
       LEFT JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
       WHERE p.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const { cliente_id, tipo_pago_id, fecha, monto, observacion } = req.body;
    const clienteIdNum = Number(cliente_id);
    const tipoPagoIdNum = Number(tipo_pago_id);
    const montoNum = Number(monto);

    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!Number.isInteger(tipoPagoIdNum) || tipoPagoIdNum <= 0) {
      return res.status(400).json({ error: "El tipo_pago_id es obligatorio" });
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
      `INSERT INTO pagos (cliente_id, tipo_pago_id, fecha, monto, observacion)
       VALUES (?, ?, ?, ?, ?)`,
      [
        clienteIdNum,
        tipoPagoIdNum,
        String(fecha).trim(),
        montoNum,
        observacion || null,
      ],
    );

    const [rows] = await pool.query(
      `SELECT id, cliente_id, tipo_pago_id, fecha, monto, observacion, creado_en
       FROM pagos WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ error: "El cliente o tipo de pago indicado no existe" });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { cliente_id, tipo_pago_id, fecha, monto, observacion } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const clienteIdNum = Number(cliente_id);
    const tipoPagoIdNum = Number(tipo_pago_id);
    const montoNum = Number(monto);

    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!Number.isInteger(tipoPagoIdNum) || tipoPagoIdNum <= 0) {
      return res.status(400).json({ error: "El tipo_pago_id es obligatorio" });
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
      `UPDATE pagos
       SET cliente_id = ?, tipo_pago_id = ?, fecha = ?, monto = ?, observacion = ?
       WHERE id = ?`,
      [
        clienteIdNum,
        tipoPagoIdNum,
        String(fecha).trim(),
        montoNum,
        observacion || null,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const [rows] = await pool.query(
      `SELECT id, cliente_id, tipo_pago_id, fecha, monto, observacion, creado_en
       FROM pagos WHERE id = ?`,
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ error: "El cliente o tipo de pago indicado no existe" });
    }
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const [result] = await pool.query("DELETE FROM pagos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    res.json({ mensaje: "Pago eliminado correctamente" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error: "No se puede eliminar el pago porque tiene cheques asociados",
      });
    }
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
