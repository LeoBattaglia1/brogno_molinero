const { Router } = require("express");
const clientesController = require("../controllers/clientes.controller");

const router = Router();

router.get("/", clientesController.index);
router.get("/:id", clientesController.show);
router.post("/", clientesController.store);
router.put("/:id", clientesController.update);
router.delete("/:id", clientesController.destroy);

module.exports = router;
