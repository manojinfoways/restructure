const {
  ProductModel,
  CurrencyModel,
  SkuGalleryModel,
  OfferModel,
  ReviewModel,
  EstimatedPickupLookup,
} = require("../models");
const {
  APIError,
  BadRequestError,
  STATUS_CODES,
} = require("../../utils/app-errors");

//Dealing with data base operations
class ProductRepository {
  async CreateCurrency(payload) {
    try {
      const { name, locale } = payload;
      // CurrencyModel.remove();
      const currency = new CurrencyModel({
        name,
        locale,
      });
      const result = await currency.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateProduct(payload) {
    try {
      const {
        name,
        desc,
        product_image,
        price,
        qty,
        _producer,
        _creator,
        _returnPolicy = null,
        _estimatedPickup = null,
      } = payload;
      const deleted = false;
      let visible = true;
      let image;

      //Check if image is uploaded or from file
      if (product_image.image) {
        image = product_image.image;
        visible = false;
      } else if (product_image.image_id) {
        const sku_gallery = await SkuGalleryModel.findById(
          product_image.image_id
        );
        if (sku_gallery) {
          image = sku_gallery.image;
        } else {
          throw new APIError(
            "",
            STATUS_CODES.INTERNAL_ERROR,
            "Provideed Image not found"
          );
        }
      }

      const currencyObj = await CurrencyModel.findOne().sort({ _id: 1 });
      const _currency = currencyObj._id;

      // ProductModel.deleteMany({});
      const product = new ProductModel({
        name,
        desc,
        image,
        price,
        qty,
        visible,
        deleted,
        _currency,
        _producer,
        _creator,
        _returnPolicy,
        _estimatedPickup,
      });
      const result = await product.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateProduct(payload) {
    try {
      const {
        _id,
        name,
        desc,
        product_image,
        price,
        qty,
        _producer,
        _returnPolicy,
        _estimatedPickup,
      } = payload;
      const _product = await ProductModel.findById(_id);
      if (_product && _product._producer.equals(_producer)) {
        _product.name = name;
        _product.desc = desc;
        _product.price = price;
        _product.qty = qty;
        _product._returnPolicy = _returnPolicy;
        _product._estimatedPickup = _estimatedPickup;

        //Check if image is uploaded or from file
        if (product_image.image) {
          _product.image = product_image.image;
          _product.visible = false;
        } else if (product_image.image_id) {
          const sku_gallery = await SkuGalleryModel.findById(
            product_image.image_id
          );
          if (sku_gallery) {
            _product.image = sku_gallery.image;
            _product.visible = true;
          } else {
            throw new APIError(
              "",
              STATUS_CODES.INTERNAL_ERROR,
              "Provideed Image not found"
            );
          }
        }

        const result = await _product.save();
        return result;
      } else {
        throw new APIError(
          "",
          STATUS_CODES.INTERNAL_ERROR,
          "Product Not found"
        );
      }
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async DeleteProduct(_id, _producer) {
    try {
      const _product = await ProductModel.findById(_id);
      if (_product && _product._producer.equals(_producer)) {
        _product.deleted = true;

        const result = await _product.save();
        return { deleted: result.deleted };
      } else {
        throw new APIError(
          "",
          STATUS_CODES.INTERNAL_ERROR,
          "Product Not found"
        );
      }
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async ProductsByProducer(payload, _producer = null) {
    try {
      const limit = 10;
      const producer_id = payload.producer_id;
      const q = { deleted: false };
      if (Array.isArray(producer_id)) {
        q._producer = { $in: producer_id };
      } else {
        q._producer = producer_id;
      }
      if (!_producer) {
        q.visible = true;
      }
      const sort = { _id: -1 };
      if (payload.previous_cursor) {
        q._id = {
          $gt: payload.previous_cursor,
        };
        sort._id = 1;
      } else if (payload.next_cursor) {
        q._id = {
          $lt: payload.next_cursor,
        };
      }
      const data = await ProductModel.find(q)
        .limit(limit)
        .sort(sort)
        .populate("_currency _producer _returnPolicy");
      // const product_data = JSON.parse(JSON.stringify(data));
      const product_data = [];
      const currentDate = new Date().toISOString();

      data.forEach(async function (arrayItem) {
        const new_array_item = arrayItem.toObject();
        if (!_producer) {
          const product_id = arrayItem._id;
          const customer_id = payload.user_id;
          const offer_record = await OfferModel.findOne({
            status: true,
            _producer: arrayItem._producer._id,
            $and: [
              {
                $or: [{ allProducts: true }, { products: product_id }],
              },
              {
                $or: [{ allCustomers: true }, { customers: customer_id }],
              },
              {
                $or: [
                  { startDate: { $exists: false } },
                  { startDate: { $lte: currentDate } },
                ],
              },
              {
                $or: [
                  { endDate: { $exists: false } },
                  { endDate: { $gte: currentDate } },
                ],
              },
            ],
            deletedAt: { $exists: false },
          }).sort({ offerPercentage: -1 });
          if (offer_record && offer_record.offerPercentage > 0) {
            new_array_item.offer_price =
              arrayItem.price -
              (arrayItem.price * offer_record.offerPercentage) / 100;
            new_array_item.offer_percentage = offer_record.offerPercentage;
          }
        }
        product_data.push(new_array_item);
      });
      if (payload.previous_cursor) data.reverse();
      let hasNext, hasPrev, lastItem, firstItem;
      if (data.length) {
        lastItem = data[data.length - 1]._id;
        firstItem = data[0]._id;

        q._id = {
          $lt: lastItem,
        };
        const r = await ProductModel.findOne(q);
        if (r) {
          hasNext = true;
        }
        q._id = {
          $gt: firstItem,
        };
        hasPrev = !!(await ProductModel.findOne(q));
      }
      const response = {
        data: product_data,
      };
      if (hasNext) {
        response.next_cursor = `${lastItem}`;
      }
      if (hasPrev) {
        response.previous_cursor = `${firstItem}`;
      }
      return response;
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async FindById(product_id, payload) {
    try {
      const product_Model = await ProductModel.findById(product_id).populate(
        "_currency _producer _returnPolicy _estimatedPickup"
      );
      if (!product_Model) {
        throw new APIError(
          "API Error",
          STATUS_CODES.BAD_REQUEST,
          "No Product Found"
        );
      }
      const product = product_Model.toObject();
      // const product_object = product;
      // ReviewModel
      const avg_rating = await ReviewModel.aggregate([
        { $match: { _product: product_Model._id } },
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);

      product.average_rating = avg_rating;
      if (avg_rating && avg_rating.length) {
        product.total_rating = avg_rating[0].count;
        product.average_rating = avg_rating[0].average;
      } else {
        product.total_rating = 0;
        product.average_rating = null;
      }

      const reviews = await ReviewModel.find({ _product: product_Model._id })
        .sort({ _id: -1 })
        .limit(5)
        .populate("_customer", "first_name last_name")
        .select(
          "_customer app_rating  product_rating order_rating payment_rating rating overall_rating review"
        );
      product.reviews = reviews;
      if (payload && payload._producer) {
        if (
          product &&
          !product.deleted &&
          product._producer._id.equals(payload._producer._id)
        ) {
          return product;
        } else {
          throw new APIError(
            "API Error",
            STATUS_CODES.BAD_REQUEST,
            "No Product Found"
          );
        }
      } else if (payload) {
        const product_object = product;

        const customer_id = payload.user_id;
        const currentDate = new Date().toISOString();
        const offer_record = await OfferModel.findOne({
          status: true,
          _producer: product_object._producer._id,
          $and: [
            {
              $or: [{ allProducts: true }, { products: product_id }],
            },
            {
              $or: [{ allCustomers: true }, { customers: customer_id }],
            },
            {
              $or: [
                { startDate: { $exists: false } },
                { startDate: { $lte: currentDate } },
              ],
            },
            {
              $or: [
                { endDate: { $exists: false } },
                { endDate: { $gte: currentDate } },
              ],
            },
          ],
          deletedAt: { $exists: false },
        }).sort({ offerPercentage: -1 });
        if (offer_record && offer_record.offerPercentage > 0) {
          product_object.offer_price =
            product_object.price -
            (product_object.price * offer_record.offerPercentage) / 100;
          product_object.offer_percentage = offer_record.offerPercentage;
        }

        return product_object;
      } else {
        return product;
      }
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }
}

module.exports = ProductRepository;
