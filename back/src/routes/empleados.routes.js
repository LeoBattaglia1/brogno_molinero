const express = require("express");
const router = express.Router();
const empleadosController = require("../controllers/empleados.controller");

router.get("/", empleadosController.index);
router.get("/:id", empleadosController.show);
router.post("/", empleadosController.store);
router.put("/:id", empleadosController.update);
router.delete("/:id", empleadosController.destroy);

module.exports = router;
