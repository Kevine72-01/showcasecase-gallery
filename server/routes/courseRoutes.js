import express from "express";

import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getCourses);
router.get("/:id", protect, getCourseById);

router.post(
  "/",
  protect,
  authorize("instructor"),
  createCourse
);

router.put(
  "/:id",
  protect,
  authorize("instructor"),
  updateCourse
);

router.delete(
  "/:id",
  protect,
  authorize("instructor"),
  deleteCourse
);

export default router;