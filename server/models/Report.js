const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: ["post", "comment"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, enum: ["spam", "violence", "abuse", "misinfo", "other"], required: true },
  description: { type: String, maxlength: 500, default: "" },
  status: { type: String, enum: ["pending", "reviewed", "actioned"], default: "pending" },
}, { timestamps: true });

reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);