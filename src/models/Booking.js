const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    psychologist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Psychologist",
      required: true,
      index: true,
    },
    slotDate: {
      type: Date,
      required: true,
      index: true,
    },
    slotDay: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      required: true,
    },
    slotStartTime: {
      type: String,
      required: true,
    },
    slotEndTime: {
      type: String,
      required: true,
    },
    sessionRate: {
      type: Number,
      required: true,
      min: 0,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "rescheduled"],
      default: "pending",
      index: true,
    },
    sessionStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    rescheduleReason: {
      type: String,
      maxlength: 500,
    },
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: String,
      enum: ["user", "psychologist", "admin"],
    },
    cancelledAt: {
      type: Date,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      maxlength: 1000,
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ user: 1, slotDate: 1 });
bookingSchema.index({ psychologist: 1, slotDate: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
