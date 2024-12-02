const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ReturnReplaceProduct = new Schema(
  {
    type: {
      type: String,
      enum: ["RT", "RP"],
    },
    _producer: { type: Schema.Types.ObjectId, ref: "producer" },
    _product: { type: Schema.Types.ObjectId, ref: "product" },
    _reason: { type: Schema.Types.ObjectId, ref: "reason_lookup" },
    _order: { type: Schema.Types.ObjectId, ref: "order" },
    _agent: { type: Schema.Types.ObjectId, ref: "customer" },
    title: {
      type: String,
    },
    text: String,
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

module.exports = mongoose.model("return_replace_product", ReturnReplaceProduct);
