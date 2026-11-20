const express = require("express");
const router = express.Router();
const chequesController = require("../controllers/cheques.controller");

router.get("/", chequesController.index);
router.get("/:id", chequesController.show);
router.post("/", chequesController.store);
router.put("/:id", chequesController.update);
router.delete("/:id", chequesController.destroy);

module.exports = router;
