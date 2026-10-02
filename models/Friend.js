const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

friendshipSchema.index(
  { senderId: 1, receiverId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Friendship", friendshipSchema);