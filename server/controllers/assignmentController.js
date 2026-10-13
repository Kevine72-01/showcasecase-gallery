import mongoose from "mongoose";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";

const getUserId = (req) => req.user?._id || req.user?.id;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isInstructor = (req) => req.user?.role === "instructor";
const isStudent = (req) => req.user?.role === "student";

export const getAssignments = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const filter = {};

    if (isInstructor(req)) {
      filter.instructor = userId;
    } else if (isStudent(req)) {
      filter.published = true;
    } else {
      return res.status(403).json({
        message: "You are not allowed to view assignments.",
      });
    }

    const assignments = await Assignment.find(filter)
      .populate("course", "title code")
      .populate("instructor", "name firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    if (isStudent(req)) {
      const assignmentIds = assignments.map((assignment) => assignment._id);

      const studentSubmissions = await Submission.find({
        student: userId,
        assignment: { $in: assignmentIds },
      }).lean();

      const submissionMap = new Map(
        studentSubmissions.map((submission) => [
          String(submission.assignment),
          submission,
        ])
      );

      const results = assignments.map((assignment) => ({
        ...assignment,
        submission: submissionMap.get(String(assignment._id)) || null,
      }));

      return res.status(200).json({ assignments: results });
    }

    return res.status(200).json({ assignments });
  } catch (error) {
    console.error("Get assignments error:", error);
    return res.status(500).json({
      message: "Unable to load assignments.",
    });
  }
};

// POST /api/assignments
export const createAssignment = async (req, res) => {
  try {
    if (!isInstructor(req)) {
      return res.status(403).json({
        message: "Only instructors can create assignments.",
      });
    }

    const { title, instructions, course, dueDate, maxScore, published } =
      req.body;

    if (!title?.trim() || !instructions?.trim() || !course || maxScore == null) {
      return res.status(400).json({
        message: "Title, instructions, course, and maximum score are required.",
      });
    }

    if (!isValidId(course)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const numericMaxScore = Number(maxScore);

    if (
      !Number.isFinite(numericMaxScore) ||
      numericMaxScore < 1 ||
      numericMaxScore > 1000
    ) {
      return res.status(400).json({
        message: "Maximum score must be between 1 and 1000.",
      });
    }

    let parsedDueDate = null;

    if (dueDate) {
      parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ message: "Invalid due date." });
      }
    }

    const assignment = await Assignment.create({
      title: title.trim(),
      instructions: instructions.trim(),
      course,
      instructor: getUserId(req),
      dueDate: parsedDueDate,
      maxScore: numericMaxScore,
      published: Boolean(published),
    });

    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate("course", "title code")
      .populate("instructor", "name firstName lastName email");

    return res.status(201).json({
      message: "Assignment created successfully.",
      assignment: populatedAssignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Unable to create assignment.",
    });
  }
};

// POST /api/assignments/:assignmentId/submissions
export const submitAssignment = async (req, res) => {
  try {
    if (!isStudent(req)) {
      return res.status(403).json({
        message: "Only students can submit assignments.",
      });
    }

    const { assignmentId } = req.params;
    const { content } = req.body;

    if (!isValidId(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment ID." });
    }

    if (!content?.trim()) {
      return res.status(400).json({
        message: "Please enter your answer before submitting.",
      });
    }

    const assignment = await Assignment.findById(assignmentId);

    if (!assignment || !assignment.published) {
      return res.status(404).json({
        message: "Published assignment not found.",
      });
    }

    if (assignment.dueDate && new Date() > assignment.dueDate) {
      return res.status(400).json({
        message: "The deadline for this assignment has passed.",
      });
    }

    const userId = getUserId(req);

    const submission = await Submission.findOneAndUpdate(
      {
        assignment: assignment._id,
        student: userId,
      },
      {
        $set: {
          content: content.trim(),
          submittedAt: new Date(),
          grade: null,
          feedback: "",
          gradedAt: null,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate("student", "name firstName lastName email")
      .populate("assignment", "title maxScore dueDate");

    return res.status(200).json({
      message: "Assignment submitted successfully.",
      submission,
    });
  } catch (error) {
    console.error("Submit assignment error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Unable to submit your assignment.",
    });
  }
};

export const getSubmissions = async (req, res) => {
  try {
    if (!isInstructor(req)) {
      return res.status(403).json({
        message: "Only instructors can view submissions.",
      });
    }

    const { assignmentId } = req.params;

    if (!isValidId(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment ID." });
    }

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      instructor: getUserId(req),
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found or you do not own it.",
      });
    }

    const submissions = await Submission.find({
      assignment: assignmentId,
    })
      .populate("student", "name firstName lastName email")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      assignment,
      submissions,
    });
  } catch (error) {
    console.error("Get submissions error:", error);
    return res.status(500).json({
      message: "Unable to load submissions.",
    });
  }
};

export const gradeSubmission = async (req, res) => {
  try {
    if (!isInstructor(req)) {
      return res.status(403).json({
        message: "Only instructors can grade submissions.",
      });
    }

    const { submissionId } = req.params;
    const { grade, feedback = "" } = req.body;

    if (!isValidId(submissionId)) {
      return res.status(400).json({ message: "Invalid submission ID." });
    }

    if (grade === "" || grade == null || !Number.isFinite(Number(grade))) {
      return res.status(400).json({
        message: "A valid grade is required.",
      });
    }

    const submission = await Submission.findById(submissionId).populate(
      "assignment"
    );

    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    if (
      !submission.assignment ||
      String(submission.assignment.instructor) !== String(getUserId(req))
    ) {
      return res.status(403).json({
        message: "You cannot grade this submission.",
      });
    }

    const numericGrade = Number(grade);

    if (
      numericGrade < 0 ||
      numericGrade > submission.assignment.maxScore
    ) {
      return res.status(400).json({
        message: `Grade must be between 0 and ${submission.assignment.maxScore}.`,
      });
    }

    submission.grade = numericGrade;
    submission.feedback = String(feedback).trim();
    submission.gradedAt = new Date();

    await submission.save();

    await submission.populate("student", "name firstName lastName email");

    return res.status(200).json({
      message: "Submission graded successfully.",
      submission,
    });
  } catch (error) {
    console.error("Grade submission error:", error);
    return res.status(500).json({
      message: "Unable to grade submission.",
    });
  }
};