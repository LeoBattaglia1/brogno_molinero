const express = require("express");
const router = express.Router();
const pagosController = require("../controllers/pagos.controller");

router.get("/", pagosController.index);
router.get("/:id", pagosController.show);
router.post("/", pagosController.store);
router.put("/:id", pagosController.update);
router.delete("/:id", pagosController.destroy);

module.exports = router;
