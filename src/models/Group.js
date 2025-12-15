// models/Group.js
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    // whether the group is active / toggle in UI
    isActive: {
      type: Boolean,
      default: true,
    },
    // number of questions in this group (for the list view)
    questionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // how many users are in this group
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// virtual for user count
groupSchema.virtual("userCount").get(function () {
  return this.users.length;
});

groupSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Group", groupSchema);
