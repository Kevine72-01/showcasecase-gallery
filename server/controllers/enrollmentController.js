import mongoose from "mongoose";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";

export const enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        message: "Valid course ID is required.",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      published: true,
    });

    if (!course) {
      return res.status(404).json({
        message: "Published course not found.",
      });
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      {
        student: req.user._id,
        course: course._id,
      },
      {
        $setOnInsert: {
          student: req.user._id,
          course: course._id,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      message: "Enrollment is active.",
      enrollment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You are already enrolled in this course.",
      });
    }

    next(error);
  }
};

export const getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user._id,
    })
      .populate({
        path: "course",
        populate: { path: "instructor", select: "name" },
      })
      .sort({ createdAt: -1 });

    res.json({ enrollments });
  } catch (error) {
    next(error);
  }
};

export const getCourseStudents = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.courseId)) {
      return res.status(400).json({
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found or access denied.",
      });
    }

    const enrollments = await Enrollment.find({
      course: course._id,
    })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.json({ enrollments });
  } catch (error) {
    next(error);
  }
};

export const completeLesson = async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;

    if (
      !mongoose.isValidObjectId(courseId) ||
      !mongoose.isValidObjectId(lessonId)
    ) {
      return res.status(400).json({
        message: "Invalid course or lesson ID.",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      published: true,
      "lessons._id": lessonId,
    });

    if (!course) {
      return res.status(404).json({
        message: "Published lesson not found.",
      });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        message: "Enroll in this course before completing lessons.",
      });
    }

    if (!enrollment.completedLessons.some(
      (id) => id.toString() === lessonId
    )) {
      enrollment.completedLessons.push(lessonId);
    }

    enrollment.status =
      enrollment.completedLessons.length >= course.lessons.length
        ? "completed"
        : "active";

    await enrollment.save();

    res.json({
      message: "Lesson progress updated.",
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};