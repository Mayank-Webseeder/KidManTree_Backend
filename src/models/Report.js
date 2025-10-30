const mongoose = require("mongoose");

const REPORT_TARGET_TYPES = ["music", "podcast", "poll", "reel", "post"];

const REPORT_CATEGORIES = [
  "Hate speech and symbols",
  "Violence and incitement",
  "Harassment or bullying",
  "Nudity or sexual activity",
  "Sale of illegal or regulated goods",
  "Spam",
  "Scams or fraud",
  "Suicide or self-injury",
];

const REPORT_STATUSES = ["pending", "resolved"];

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: REPORT_TARGET_TYPES,
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: REPORT_CATEGORIES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = {
  Report: mongoose.model("Report", reportSchema),
  REPORT_TARGET_TYPES,
  REPORT_CATEGORIES,
  REPORT_STATUSES,
};
