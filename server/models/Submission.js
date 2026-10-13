import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    answer: {
      type: String,
      trim: true,
      maxlength: 20000,
      default: "",
    },

    attachmentUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    score: {
      type: Number,
      min: 0,
      default: null,
    },

    feedback: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    gradedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

submissionSchema.index(
  { assignment: 1, student: 1 },
  { unique: true }
);

export default mongoose.model("Submission", submissionSchema);