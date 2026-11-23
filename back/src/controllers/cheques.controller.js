const { pool } = require("../config/db");

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizarFechaSql(valor) {
  if (!valor) return null;
  const limpia = String(valor).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(limpia) ? limpia : null;
}

function resolverFechaResolucion(
  estadoVal,
  fechaResolucionInput,
  fechaExistente = null,
) {
  const est = String(estadoVal || "").toLowerCase();
  if (est === "cobrado" || est === "rechazado") {
    return (
      normalizarFechaSql(fechaResolucionInput) ||
      normalizarFechaSql(fechaExistente) ||
      hoyISO()
    );
  }
  return null;
}

async function index(req, res, next) {
  try {
    const clienteId = req.query.cliente_id
      ? Number(req.query.cliente_id)
      : null;
    const estado = req.query.estado ? String(req.query.estado).trim() : null;

    let sql = `
      SELECT ch.id, ch.pago_id, ch.cliente_id, cl.nombre AS cliente_nombre,
             ch.numero_cheque, ch.banco, ch.monto,
             ch.fecha_vencimiento, ch.fecha_resolucion, ch.estado, ch.creado_en
      FROM cheques ch
      LEFT JOIN clientes cl ON cl.id = ch.cliente_id
      WHERE 1=1
    `;
    const params = [];

    if (clienteId && Number.isInteger(clienteId) && clienteId > 0) {
      sql += " AND ch.cliente_id = ?";
      params.push(clienteId);
    }
    if (estado) {
      sql += " AND ch.estado = ?";
      params.push(estado);
    }

    sql += " ORDER BY ch.fecha_vencimiento ASC, ch.id DESC";

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
      return res.status(400).json({ error: "ID de cheque inválido" });
    }

    const [rows] = await pool.query(
      `SELECT ch.id, ch.pago_id, ch.cliente_id, cl.nombre AS cliente_nombre,
              ch.numero_cheque, ch.banco, ch.monto,
              ch.fecha_vencimiento, ch.fecha_resolucion, ch.estado, ch.creado_en
       FROM cheques ch
       LEFT JOIN clientes cl ON cl.id = ch.cliente_id
       WHERE ch.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Cheque no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    const {
      pago_id,
      cliente_id,
      numero_cheque,
      banco,
      monto,
      fecha_vencimiento,
      fecha_resolucion,
      estado,
    } = req.body;

    const pagoIdNum = Number(pago_id);
    const clienteIdNum = Number(cliente_id);
    const montoNum = Number(monto);

    if (!Number.isInteger(pagoIdNum) || pagoIdNum <= 0) {
      return res.status(400).json({ error: "El pago_id es obligatorio" });
    }
    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!numero_cheque || !String(numero_cheque).trim()) {
      return res
        .status(400)
        .json({ error: "El número de cheque es obligatorio" });
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
    const fechaVencLimpia = normalizarFechaSql(fecha_vencimiento);
    if (!fechaVencLimpia) {
      return res
        .status(400)
        .json({ error: "La fecha de vencimiento es obligatoria" });
    }

    const estadoVal =
      estado && String(estado).trim() ? String(estado).trim() : "pendiente";
    const fechaResolucionVal = resolverFechaResolucion(
      estadoVal,
      fecha_resolucion,
      null,
    );

    const [result] = await pool.query(
      `INSERT INTO cheques
        (pago_id, cliente_id, numero_cheque, banco, monto, fecha_vencimiento, fecha_resolucion, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pagoIdNum,
        clienteIdNum,
        String(numero_cheque).trim(),
        banco || null,
        montoNum,
        fechaVencLimpia,
        fechaResolucionVal,
        estadoVal,
      ],
    );

    const [rows] = await pool.query(
      `SELECT id, pago_id, cliente_id, numero_cheque, banco, monto,
              fecha_vencimiento, fecha_resolucion, estado, creado_en
       FROM cheques WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ error: "El pago o cliente indicado no existe" });
    }
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de cheque inválido" });
    }

    const [actualRows] = await pool.query(
      "SELECT * FROM cheques WHERE id = ?",
      [id],
    );
    if (actualRows.length === 0) {
      return res.status(404).json({ error: "Cheque no encontrado" });
    }
    const actual = actualRows[0];

    const pagoIdNum =
      req.body.pago_id !== undefined
        ? Number(req.body.pago_id)
        : Number(actual.pago_id);
    const clienteIdNum =
      req.body.cliente_id !== undefined
        ? Number(req.body.cliente_id)
        : Number(actual.cliente_id);
    const numeroChequeVal =
      req.body.numero_cheque !== undefined
        ? String(req.body.numero_cheque).trim()
        : String(actual.numero_cheque || "").trim();
    const bancoVal =
      req.body.banco !== undefined
        ? req.body.banco || null
        : actual.banco || null;
    const montoNum =
      req.body.monto !== undefined
        ? Number(req.body.monto)
        : Number(actual.monto);
    const fechaVencLimpia =
      req.body.fecha_vencimiento !== undefined
        ? normalizarFechaSql(req.body.fecha_vencimiento)
        : normalizarFechaSql(actual.fecha_vencimiento);
    const estadoVal =
      req.body.estado !== undefined && String(req.body.estado).trim()
        ? String(req.body.estado).trim()
        : String(actual.estado || "pendiente");

    if (!Number.isInteger(pagoIdNum) || pagoIdNum <= 0) {
      return res.status(400).json({ error: "El pago_id es obligatorio" });
    }
    if (!Number.isInteger(clienteIdNum) || clienteIdNum <= 0) {
      return res.status(400).json({ error: "El cliente_id es obligatorio" });
    }
    if (!numeroChequeVal) {
      return res
        .status(400)
        .json({ error: "El número de cheque es obligatorio" });
    }
    if (Number.isNaN(montoNum)) {
      return res
        .status(400)
        .json({ error: "El monto es obligatorio y debe ser numérico" });
    }
    if (!fechaVencLimpia) {
      return res
        .status(400)
        .json({ error: "La fecha de vencimiento es obligatoria" });
    }

    const fechaResolucionVal = resolverFechaResolucion(
      estadoVal,
      req.body.fecha_resolucion,
      actual.fecha_resolucion,
    );

    await pool.query(
      `UPDATE cheques
       SET pago_id = ?, cliente_id = ?, numero_cheque = ?, banco = ?,
           monto = ?, fecha_vencimiento = ?, fecha_resolucion = ?, estado = ?
       WHERE id = ?`,
      [
        pagoIdNum,
        clienteIdNum,
        numeroChequeVal,
        bancoVal,
        montoNum,
        fechaVencLimpia,
        fechaResolucionVal,
        estadoVal,
        id,
      ],
    );

    const [rows] = await pool.query(
      `SELECT id, pago_id, cliente_id, numero_cheque, banco, monto,
              fecha_vencimiento, fecha_resolucion, estado, creado_en
       FROM cheques WHERE id = ?`,
      [id],
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(400)
        .json({ error: "El pago o cliente indicado no existe" });
    }
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de cheque inválido" });
    }

    const [result] = await pool.query("DELETE FROM cheques WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cheque no encontrado" });
    }

    res.json({ mensaje: "Cheque eliminado correctamente" });
  } catch (error) {
    next(error);
  }
}

module.exports = { index, show, store, update, destroy };
