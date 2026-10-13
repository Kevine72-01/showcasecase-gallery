import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const createToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  bio: user.bio,
  createdAt: user.createdAt,
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Please provide a valid name, email, and password.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must contain 2–100 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (
      password.length < 8 ||
      password.length > 72 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return res.status(400).json({
        message:
          "Password must be 8–72 characters and include uppercase, lowercase, a number, and a special character.",
      });
    }

    if (role && role !== "student") {
      return res.status(403).json({
        message: "Instructor accounts cannot be created through public registration.",
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: "student",
    });

    return res.status(201).json({
      message: "Registration successful.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user._id.toString());

    return res.json({
      message: "Login successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: publicUser(req.user) });
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;

    if (
      name !== undefined &&
      (typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100)
    ) {
      return res.status(400).json({
        message: "Name must contain 2–100 characters.",
      });
    }

    if (
      bio !== undefined &&
      (typeof bio !== "string" || bio.length > 500)
    ) {
      return res.status(400).json({
        message: "Bio must not exceed 500 characters.",
      });
    }

    if (name !== undefined) req.user.name = name.trim();
    if (bio !== undefined) req.user.bio = bio.trim();

    await req.user.save();

    res.json({
      message: "Profile updated successfully.",
      user: publicUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};