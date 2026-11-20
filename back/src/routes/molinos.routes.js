const express = require("express");
const router = express.Router();
const molinosController = require("../controllers/molinos.controller");

router.get("/", molinosController.index);
router.get("/:id", molinosController.show);
router.post("/", molinosController.store);
router.put("/:id", molinosController.update);
router.delete("/:id", molinosController.destroy);

module.exports = router;
