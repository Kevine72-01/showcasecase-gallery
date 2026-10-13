import express from "express";

import {
  enrollInCourse,
  getMyEnrollments,
  getCourseStudents,
  completeLesson,
} from "../controllers/enrollmentController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Student enrollment routes
router.post("/", authorize("student"), enrollInCourse);
router.get("/mine", authorize("student"), getMyEnrollments);

// Instructor route: view students enrolled in a course
router.get(
  "/course/:courseId/students",
  authorize("instructor"),
  getCourseStudents
);

// Student route: mark a lesson as complete
router.patch(
  "/course/:courseId/lessons/:lessonId/complete",
  authorize("student"),
  completeLesson
);

export default router;
