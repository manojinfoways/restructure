const mongoose = require("mongoose");
const { S3_URL } = require("../../config");

const Schema = mongoose.Schema;

const OrderDetailsSchema = new Schema(
  {
    _order: { type: Schema.Types.ObjectId, ref: "order", required: true },
    _producer: { type: Schema.Types.ObjectId, ref: "producer", required: true },
    _product: { type: Schema.Types.ObjectId, ref: "product", required: true },
    product_name: String,
    product_image: String,
    price: Number,
    qty: { type: Number, require: true },
    original_price: Number,
    offer_percentage: Number,
    offer_id: { type: Schema.Types.ObjectId, ref: "offer" },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "ready",
        "shipped",
        "delivered",
        "rejected",
        "cancelled",
        "return_requested",
        "returned",
        "refund_process",
        "refunded",
        "replace_requested",
        "replaced",
      ],
      default: "pending",
    },
    src_address: {
      type: String,
      get: function (data) {
        try {
          return JSON.parse(data);
        } catch (error) {
          return data;
        }
      },
      set: function (data) {
        return JSON.stringify(data);
      },
    },
    history: [
      {
        type: new mongoose.Schema(
          {
            status: { type: String, require: true },
          },
          { timestamps: true }
        ),
      },
    ],
    reject_reason: { type: String, default: null },
    settlement_status: Boolean,
    _settlement: String,
    _delivery_agent: { type: Schema.Types.ObjectId, ref: "customer" },
  },
  {
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
      },
      getters: true,
    },
    toObject: {
      transform(doc, ret) {
        delete ret.__v;
      },
      getters: true,
    },
    timestamps: true,
  }
);

OrderDetailsSchema.virtual("product_image_url").get(function () {
  if (this.product_image) {
    return S3_URL + "/" + this.product_image;
  } else {
    return "";
  }
});

OrderDetailsSchema.virtual("order_item_total").get(function () {
  return parseFloat(this.price) * parseFloat(this.qty);
});
OrderDetailsSchema.virtual("product_desc").get(function () {
  return this._product && this._product.desc ? this._product.desc : "";
});
// OrderDetailsSchema.virtual('reject_reason').get(function() {
//   return (this.reject_reason) ? this.reject_reason : '';
// });

module.exports = mongoose.model("order_details", OrderDetailsSchema);
