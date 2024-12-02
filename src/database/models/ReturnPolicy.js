const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ReturnPolicySchema = new Schema(
  {
    title: String,
    code: { type: String, unique: true },
  },
  {
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.__v;
        // delete ret._id;
      },
      virtuals: true,
    },
    timestamps: true,
  }
);

module.exports = mongoose.model("return_policy", ReturnPolicySchema);
