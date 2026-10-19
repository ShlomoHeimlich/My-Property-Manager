import { Router } from "express";
import { authenticateToken } from "../middlewares/authenticateToken.js";
import {
    addTransaction,
    create,
    getOne,
    list,
    listTransactions,
    removeTransaction,
    setStatus,
    update,
} from "../Controllers/propertyController.js";

const router = Router();

router.use(authenticateToken);
router.get("/", list);
router.post("/", create);
router.get("/:id/transactions", listTransactions);
router.post("/:id/transactions", addTransaction);
router.delete("/:id/transactions/:transactionId", removeTransaction);
router.get("/:id", getOne);
router.put("/:id", update);
router.patch("/:id/status", setStatus);

export default router;