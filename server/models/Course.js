import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 20000,
      default: "",
    },
    materialUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
    },
  },
  { timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required."],
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    code: {
      type: String,
      required: [true, "Course code is required."],
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    description: {
      type: String,
      required: [true, "Description is required."],
      trim: true,
      maxlength: 3000,
    },

    category: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "General",
    },

    thumbnail: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    lessons: {
      type: [lessonSchema],
      default: [],
    },

    published: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

courseSchema.index({ title: "text", description: "text", code: "text" });
courseSchema.index({ instructor: 1, createdAt: -1 });

courseSchema.index({ code: 1 }, { unique: true });

export default mongoose.model("Course", courseSchema);