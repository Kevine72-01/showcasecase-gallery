import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Enrollment from "../models/Enrollment.js";

export const getAssignments = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "instructor") {
      filter.instructor = req.user._id;
    }

    if (req.query.courseId) {
      filter.course = req.query.courseId;
    }

    const assignments = await Assignment.find(filter)
      .populate("course", "title")
      .populate("instructor", "name email")
      .sort({ dueDate: 1 });

    if (req.user.role === "student") {
      const submissions = await Submission.find({
        student: req.user._id,
        assignment: { $in: assignments.map((a) => a._id) },
      });

      const submissionMap = new Map(
        submissions.map((s) => [s.assignment.toString(), s])
      );

      return res.json(
        assignments.map((a) => ({
          ...a.toObject(),
          submission: submissionMap.get(a._id.toString()) || null,
        }))
      );
    }

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAssignment = async (req, res) => {
  try {
    const {
      title,
      instructions,
      course,
      dueDate,
      maxScore,
      published,
    } = req.body;

    if (!title?.trim() || !instructions?.trim() || !course) {
      return res.status(400).json({
        message: "Title, instructions, and course are required.",
      });
    }

    const Course = (await import("../models/Course.js")).default;
    const selectedCourse = await Course.findById(course);

    if (!selectedCourse) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    if (
      !selectedCourse.instructor ||
      selectedCourse.instructor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You can only create assignments for your own courses.",
      });
    }

    const parsedScore =
      maxScore === "" || maxScore === undefined || maxScore === null
        ? 100
        : Number(maxScore);

    if (
      !Number.isFinite(parsedScore) ||
      parsedScore < 1 ||
      parsedScore > 1000
    ) {
      return res.status(400).json({
        message: "Maximum score must be between 1 and 1000.",
      });
    }

    const assignment = await Assignment.create({
      title: title.trim(),
      instructions: instructions.trim(),
      course,
      instructor: req.user._id,
      dueDate: dueDate || null,
      maxScore: parsedScore,
      published: Boolean(published),
    });

    return res.status(201).json({
      message: "Assignment created successfully.",
      assignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};


export const submitAssignment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        message: "Submission content is required.",
      });
    }

    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    if (new Date() > assignment.dueDate) {
      return res.status(400).json({
        message: "The deadline for this assignment has passed.",
      });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: assignment.course,
    });

    if (!enrollment) {
      return res.status(403).json({
        message: "You must be enrolled in this course to submit.",
      });
    }

    const submission = await Submission.findOneAndUpdate(
      {
        assignment: assignment._id,
        student: req.user._id,
      },
      {
        content: content.trim(),
        submittedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/assignments/:assignmentId/submissions
export const getSubmissions = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only view submissions for your own assignments.",
      });
    }

    const submissions = await Submission.find({
      assignment: assignment._id,
    })
      .populate("student", "name email")
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/assignments/submissions/:submissionId/grade
export const gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;

    if (
      grade === undefined ||
      grade === null ||
      !Number.isFinite(Number(grade)) ||
      Number(grade) < 0
    ) {
      return res.status(400).json({
        message: "A valid grade of zero or greater is required.",
      });
    }

    const submission = await Submission.findById(req.params.submissionId);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const assignment = await Assignment.findById(submission.assignment);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only grade your own assignments.",
      });
    }

    if (Number(grade) > assignment.totalPoints) {
      return res.status(400).json({
        message: `Grade cannot exceed ${assignment.totalPoints} points.`,
      });
    }

    submission.grade = Number(grade);
    submission.feedback = feedback || "";
    submission.gradedAt = new Date();

    await submission.save();

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
