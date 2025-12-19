const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    contact: {
      type: String,
      required: true,
      unique: true,
    },
    age: {
      type: Number,
      required: true,
      min: 13,
      max: 120,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin", "psychologist", "user-panel"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isContactVerified: {
      type: Boolean,
      default: false,
    },
    docx: {
      type: String,
      default: null,
    },
    isDocxVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    tempToken: {
      type: String,
      sparse: true,
    },
    resetToken: {
      type: String,
      sparse: true,
    },
    resetExpires: {
      type: Date,
      sparse: true,
    },
    reset: {
      otp: { type: String },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
    },
    parentConsent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParentConsent",
    },
    notificationPrefs: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotificationPrefs",
    },
    profile: {
      avatar: String,
      bio: String,
      interests: [String],
      emergencyContact: {
        name: String,
        phone: String,
        relationship: String,
      },
    },
    // User-panel specific fields
    modules: [
      {
        name: {
          type: String,
          required: true,
        },
        route: {
          type: String,
          required: true,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for tempToken lookups
userSchema.index({ tempToken: 1 }, { sparse: true });

userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Check if the password is already a bcrypt hash
  if (typeof this.password === 'string' && /^\$2[aby]\$/.test(this.password)) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});


module.exports = mongoose.model("User", userSchema);
