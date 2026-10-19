import { Router } from "express";
import { currentUser, login, register } from "../Controllers/authController.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, currentUser);

export default router;