const mongoose = require("mongoose");

const scheduleSlotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

const psychologistSchema = new mongoose.Schema(
  {
    // Full display name; kept for backward compatibility and sorting
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Added fields to support public application form
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    degree: {
      type: String,
      required: true,
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    about: {
      type: String,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    specializations: [
      {
        type: String,
        enum: [
          "Anxiety",
          "Depression",
          "PTSD",
          "Relationships",
          "Family Therapy",
          "Child Psychology",
          "Addiction",
          "Eating Disorders",
          "Sleep Disorders",
          "Stress Management",
          "Grief Counseling",
          "Behavioral Issues",
        ],
      },
    ],
    schedule: [scheduleSlotSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    // Application status workflow
    status: {
      type: String,
      enum: ["pending", "selected", "rejected"],
      default: "pending",
      index: true,
    },
    accountActivatedAt: {
      type: Date,
    },
    profileImage: {
      type: String,
    },
    languages: [String],
    sessionRate: {
      type: Number,
      min: 0,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    // New fields
    city: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["psychologist", "counselor"],
      default: "psychologist",
      required: true,
    },
    aadharNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[0-9]{12}$/,
    },
    aadharDocument: {
      type: String, // URL to uploaded document
      required: true,
    },
    uploadDocuments: [
      {
        type: String, // Array of URLs to uploaded documents
      },
    ],
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          maxlength: 500,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

psychologistSchema.virtual("averageRating").get(function () {
  const reviews = this.reviews || [];
  if (reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / this.reviews.length) * 10) / 10;
});

psychologistSchema.set("toJSON", { virtuals: true });

// Ensure name is populated from first/last if missing
psychologistSchema.pre("save", function (next) {
  if (
    (!this.name || this.name.trim().length === 0) &&
    (this.firstName || this.lastName)
  ) {
    const parts = [this.firstName, this.lastName].filter(Boolean);
    if (parts.length > 0) {
      this.name = parts.join(" ").trim();
    }
  }
  next();
});

module.exports = mongoose.model("Psychologist", psychologistSchema);
