// const mongoose = require("mongoose");

// const pollSchema = new mongoose.Schema(
//   {
//     question: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 300,
//     },
//     options: [
//       {
//         text: {
//           type: String,
//           required: true,
//           maxlength: 100,
//         },
//         votes: [
//           {
//             user: {
//               type: mongoose.Schema.Types.ObjectId,
//               ref: "User",
//               required: true,
//             },
//             createdAt: {
//               type: Date,
//               default: Date.now,
//             },
//           },
//         ],
//       },
//     ],
//     creator: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     expiresAt: {
//       type: Date,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//     visibility: {
//       type: String,
//       enum: ["public", "private"],
//       default: "public",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Virtual for total votes count
// pollSchema.virtual("totalVotes").get(function () {
//   return this.options.reduce((total, option) => total + option.votes.length, 0);
// });

// // Virtual for percentage calculation
// pollSchema.virtual("optionsWithPercentage").get(function () {
//   const totalVotes = this.totalVotes;
//   return this.options.map((option) => ({
//     ...option.toJSON(),
//     voteCount: option.votes.length,
//     percentage:
//       totalVotes > 0
//         ? ((option.votes.length / totalVotes) * 100).toFixed(1)
//         : 0,
//   }));
// });

// // Ensure virtuals are included in JSON output
// pollSchema.set("toJSON", { virtuals: true });

// // Index for better query performance
// pollSchema.index({ creator: 1, isDeleted: 1, isActive: 1 });
// pollSchema.index({ isDeleted: 1, isActive: 1, createdAt: -1 });

// module.exports = mongoose.model("Poll", pollSchema);

const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    options: [
      {
        text: {
          type: String,
          required: true,
          maxlength: 100,
        },
        votes: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // REMOVED: expiresAt field - polls never expire
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for total votes count
pollSchema.virtual("totalVotes").get(function () {
  return this.options.reduce((total, option) => total + option.votes.length, 0);
});

// Virtual for percentage calculation
pollSchema.virtual("optionsWithPercentage").get(function () {
  const totalVotes = this.totalVotes;
  return this.options.map((option) => ({
    ...option.toJSON(),
    voteCount: option.votes.length,
    percentage:
      totalVotes > 0
        ? ((option.votes.length / totalVotes) * 100).toFixed(1)
        : 0,
  }));
});

// Ensure virtuals are included in JSON output
pollSchema.set("toJSON", { virtuals: true });

// Index for better query performance
pollSchema.index({ creator: 1, isDeleted: 1, isActive: 1 });
pollSchema.index({ isDeleted: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Poll", pollSchema);
