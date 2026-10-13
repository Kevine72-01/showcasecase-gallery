import express from "express";

import {
  getAssignments,
  createAssignment,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
} from "../controllers/assignmentController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getAssignments);
router.post("/", createAssignment);

router.post("/:assignmentId/submissions", submitAssignment);
router.get("/:assignmentId/submissions", getSubmissions);

router.patch(
  "/submissions/:submissionId/grade",
  gradeSubmission
);

export default router;