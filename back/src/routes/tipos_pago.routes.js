const express = require("express");
const router = express.Router();
const tiposPagoController = require("../controllers/tipos_pago.controller");

router.get("/", tiposPagoController.index);
router.get("/:id", tiposPagoController.show);
router.post("/", tiposPagoController.store);
router.put("/:id", tiposPagoController.update);
router.delete("/:id", tiposPagoController.destroy);

module.exports = router;
