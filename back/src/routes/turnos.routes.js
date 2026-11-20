const express = require("express");
const router = express.Router();
const turnosController = require("../controllers/turnos.controller");

router.get("/", turnosController.index);
router.get("/:id", turnosController.show);
router.post("/", turnosController.store);
router.put("/:id", turnosController.update);
router.delete("/:id", turnosController.destroy);

module.exports = router;
