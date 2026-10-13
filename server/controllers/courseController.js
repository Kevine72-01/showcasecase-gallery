import mongoose from "mongoose";
import Course from "../models/Course.js";

const validId = (id) => mongoose.isValidObjectId(id);

const cleanCourseInput = (body) => {
  const data = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.code !== undefined) data.code = body.code;
  if (body.description !== undefined) {
    data.description = body.description;
  }
  if (body.category !== undefined) data.category = body.category;
  if (body.thumbnail !== undefined) data.thumbnail = body.thumbnail;
  if (body.published !== undefined) data.published = body.published;

  if (body.lessons !== undefined) {
    data.lessons = body.lessons;
  }

  return data;
};

const validateCourseInput = (data, res) => {
  if (
    data.title !== undefined &&
    (typeof data.title !== "string" ||
      data.title.trim().length < 3 ||
      data.title.trim().length > 150)
  ) {
    res.status(400).json({
      message: "Course title must contain 3–150 characters.",
    });
    return false;
  }

  if (
    data.code !== undefined &&
    (typeof data.code !== "string" ||
      !/^[A-Za-z0-9_-]{2,20}$/.test(data.code.trim()))
  ) {
    res.status(400).json({
      message: "Course code must contain 2–20 letters, numbers, hyphens, or underscores.",
    });
    return false;
  }

  if (
    data.description !== undefined &&
    (typeof data.description !== "string" ||
      !data.description.trim() ||
      data.description.length > 3000)
  ) {
    res.status(400).json({
      message: "Description is required and must not exceed 3000 characters.",
    });
    return false;
  }

  if (
    data.category !== undefined &&
    (typeof data.category !== "string" ||
      data.category.length > 80)
  ) {
    res.status(400).json({
      message: "Category must not exceed 80 characters.",
    });
    return false;
  }

  if (
    data.thumbnail !== undefined &&
    (typeof data.thumbnail !== "string" ||
      data.thumbnail.length > 2048)
  ) {
    res.status(400).json({
      message: "Invalid thumbnail URL.",
    });
    return false;
  }

  if (
    data.published !== undefined &&
    typeof data.published !== "boolean"
  ) {
    res.status(400).json({
      message: "Published must be true or false.",
    });
    return false;
  }

  if (data.lessons !== undefined) {
    if (
      !Array.isArray(data.lessons) ||
      data.lessons.length > 100
    ) {
      res.status(400).json({
        message: "A course may contain up to 100 lessons.",
      });
      return false;
    }

    for (const lesson of data.lessons) {
      if (
        !lesson ||
        typeof lesson.title !== "string" ||
        !lesson.title.trim() ||
        lesson.title.length > 150 ||
        typeof (lesson.content ?? "") !== "string" ||
        (lesson.content ?? "").length > 20000 ||
        typeof (lesson.materialUrl ?? "") !== "string" ||
        (lesson.materialUrl ?? "").length > 2048
      ) {
        res.status(400).json({
          message: "One or more lessons contain invalid information.",
        });
        return false;
      }
    }
  }

  return true;
};

export const getCourses = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 9)
    );
    const skip = (page - 1) * limit;

    const filter = {};

    if (!req.user || req.user.role === "student") {
      filter.published = true;
    } else if (req.query.mine === "true") {
      filter.instructor = req.user._id;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);

      if (search) {
        filter.$text = { $search: search };
      }
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("instructor", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Course.countDocuments(filter),
    ]);

    res.json({
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseById = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const course = await Course.findById(req.params.id)
      .populate("instructor", "name bio");

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const isOwner =
      req.user &&
      course.instructor._id.toString() === req.user._id.toString();

    if (!course.published && !isOwner) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.json({ course });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req, res, next) => {
  try {
    const data = cleanCourseInput(req.body);

    if (
      !data.title ||
      !data.code ||
      !data.description ||
      !validateCourseInput(data, res)
    ) {
      if (!res.headersSent) {
        return res.status(400).json({
          message: "Title, course code, and description are required.",
        });
      }

      return;
    }

    const course = await Course.create({
      ...data,
      instructor: req.user._id,
    });

    res.status(201).json({
      message: "Course created successfully.",
      course,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This course code is already in use.",
      });
    }

    next(error);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const data = cleanCourseInput(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    if (!validateCourseInput(data, res)) return;

    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found or you do not own this course.",
      });
    }

    Object.assign(course, data);
    await course.save();

    res.json({
      message: "Course updated successfully.",
      course,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This course code is already in use.",
      });
    }

    next(error);
  }
};

export const deleteCourse = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      instructor: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found or you do not own this course.",
      });
    }

    res.json({ message: "Course deleted successfully." });
  } catch (error) {
    next(error);
  }
};