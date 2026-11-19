const { pool } = require("../config/db");

async function index(req, res, next) {
  try {
    res.json({ mensaje: "index pendiente de implementar" });
  } catch (error) {
    next(error);
  }
}

async function show(req, res, next) {
  try {
    res.json({ mensaje: "show pendiente de implementar" });
  } catch (error) {
    next(error);
  }
}

async function store(req, res, next) {
  try {
    res.status(201).json({ mensaje: "store pendiente de implementar" });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    res.json({ mensaje: "update pendiente de implementar" });
  } catch (error) {
    next(error);
  }
}

async function destroy(req, res, next) {
  try {
    res.json({ mensaje: "destroy pendiente de implementar" });
  } catch (error) {
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
