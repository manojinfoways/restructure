const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ReasonLookup = new Schema(
  {
    type: {
      type: String,
      enum: ["RT", "RP"],
    },
    _producer: { type: Schema.Types.ObjectId, ref: "producer" },
    title: {
      type: String,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
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

module.exports = mongoose.model("reason_lookup", ReasonLookup);
