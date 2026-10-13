import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    instructions: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    maxScore: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },

    published: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ course: 1, dueDate: 1 });

export default mongoose.model("Assignment", assignmentSchema);