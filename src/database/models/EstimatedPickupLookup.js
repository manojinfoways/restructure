const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const EstimatedPickup = new Schema(
  {
    _producer: { type: Schema.Types.ObjectId, ref: "producer" },
    title: {
      type: String,
    },
    deleted: { type: Boolean, default: false },
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
      },
      virtuals: true,
    },
    timestamps: true,
  }
);

module.exports = mongoose.model("estimated_pickup_lookup", EstimatedPickup);
