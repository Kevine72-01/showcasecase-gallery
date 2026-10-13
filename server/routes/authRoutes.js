import express from "express";
import rateLimit from "express-rate-limit";

import {
  register,
  login,
  getMe,
  updateProfile,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

export default router;