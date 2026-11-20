const express = require("express");
const router = express.Router();
const camposController = require("../controllers/campos.controller");

router.get("/", camposController.index);
router.get("/:id", camposController.show);
router.post("/", camposController.store);
router.put("/:id", camposController.update);
router.delete("/:id", camposController.destroy);

module.exports = router;
