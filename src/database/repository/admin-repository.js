const {
  ProducerModel,
  CustomerModel,
  CurrencyModel,
  ProductModel,
  ChargeModel,
  SkuGalleryModel,
  FaqModel,
  OrderDetailsModel,
  ReturnPolicyModel,
} = require("../models");
// const { v4: uuidv4 } = require('uuid');
const { APIError, STATUS_CODES } = require("../../utils/app-errors");
const { GetDistance, FormateData, GenerateSignature } = require("../../utils");
const { check } = require("express-validator");
const ReturnPolicy = require("../models/ReturnPolicy");
const Producer = require("../models/Producer");
const { default: mongoose } = require("mongoose");

//Dealing with data base operations
class AdminRepository {
  async FindProducerUser({ fb_id }) {
    try {
      const existingProducer = await CustomerModel.findOne({ fb_id: fb_id });
      return existingProducer;
    } catch (err) {
      throw new APIError(
        "API Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Producer"
      );
    }
  }

  async UpdateProducerUser(customerId, user) {
    try {
      const profile = await CustomerModel.findById(customerId);

      if (profile) {
        if (user.device_id) {
          profile.device_id = user.device_id;
        }
        if (user.fcm_id) {
          profile.fcm_id = user.fcm_id;
        }
        if (user.distance) {
          profile.distance = user.distance;
        }

        const profileResult = await profile.save();

        return profileResult;
      }

      throw new Error("Unable to update user!");
    } catch (err) {
      throw new APIError(
        "API Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to update user!"
      );
    }
  }

  async FindProducerUserById({ id }) {
    try {
      const existingCustomer = await CustomerModel.findById(id).populate(
        "address"
      );
      return existingCustomer;
    } catch (err) {
      throw new APIError(
        "API Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Customer"
      );
    }
  }

  async CreateProducer({ name, desc, banner, icon, status }) {
    try {
      const producer = new ProducerModel({
        name,
        desc,
        banner,
        icon,
        status,
      });
      const producerResult = await producer.save();
      return producerResult;
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateProducerDetails(payload) {
    try {
      const { _id, name, desc, status, banner, icon } = payload;
      const _producer = await ProducerModel.findById(_id);

      if (_producer) {
        _producer.name = name;
        _producer.desc = desc;
        _producer.status = status;

        if (banner) {
          _producer.banner = banner;
        }
        if (icon) {
          _producer.icon = icon;
        }
        //Check if image is uploaded or from file
        // if (product_image.image) {
        //   _producer.image = product_image.image;
        //   _producer.visible = false;
        // } else if (product_image.image_id) {
        //   const sku_gallery = await SkuGalleryModel.findById(
        //     product_image.image_id
        //   );
        //   if (sku_gallery) {
        //     _producer.image = sku_gallery.image;
        //     _producer.visible = true;
        //   } else {
        //     throw new APIError(
        //       "",
        //       STATUS_CODES.INTERNAL_ERROR,
        //       "Provideed Image not found"
        //     );
        //   }
        // }

        const result = await _producer.save();
        return result;
      } else {
        throw new APIError(
          "",
          STATUS_CODES.INTERNAL_ERROR,
          "Producer Not found"
        );
      }
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async AssignUserToProducer({ producer_id, user_id }) {
    try {
      const producer = await ProducerModel.findById(producer_id);

      if (producer) {
        const user = await CustomerModel.findById(user_id);
        if (user) {
          // producer.user.push(user);
          user._producer = producer_id;
          user.user_type = "producer";
          user.distance = 100;
          await user.save();
        }

        // await newAddress.save();
      }
      const producerResult = await producer.save();
      return producerResult;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async MakeAgent(user_id) {
    try {
      const user = await CustomerModel.findById(user_id);

      if (user) {
        user.user_type = "agent";
        await user.save();
      }
      return user;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async switchFbIds({ fb_id, new_fb_id }) {
    try {
      const user = await CustomerModel.findOne({ fb_id: fb_id });
      const isExist = await CustomerModel.findOne({ fb_id: new_fb_id });
      if (user) {
        if (isExist) {
          throw new APIError(
            "",
            STATUS_CODES.INTERNAL_ERROR,
            "New fb id already exist"
          );
        } else {
          user.fb_id = new_fb_id;
          await user.save();
          return user;
        }
      } else {
        throw new APIError("", STATUS_CODES.INTERNAL_ERROR, "User Not exist");
      }
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async ProducersWithDistance(payload) {
    try {
      const producers = await ProducerModel.find();
      var producer_found = [];
      if (payload && payload.latitude && payload.longitude) {
        const coordinate2 = { lat: payload.latitude, long: payload.longitude };
        for (let index = 0; index < producers.length; index++) {
          const producer = producers[index];
          const user_elements = await CustomerModel.find({
            _producer: producer._id,
          });
          // const user_elements = producer.user;

          if (user_elements.length) {
            for (
              let index_user = 0;
              index_user < user_elements.length;
              index_user++
            ) {
              const user_element = user_elements[index_user];
              const coordinate1 = {
                lat: user_element.latitude,
                long: user_element.longitude,
              };
              const distance = user_element.distance
                ? Math.abs(user_element.distance)
                : 0;
              var point_distance = GetDistance(coordinate1, coordinate2);
              if (point_distance <= distance) {
                producer_found.push({
                  store_id: producer.id,
                  user_id: user_element.id,
                  name: producer.name,
                  banner: producer.banner,
                  icon: producer.icon,
                  banner_url: producer.banner_url,
                  icon_url: producer.icon_url,
                  distance: point_distance,
                });
                break;
              }
            }
          }
        }
        return producer_found;
      } else {
        return producers;
      }
    } catch (err) {
      console.log(err);
      throw APIError(
        "API Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Producer"
      );
    }
  }

  async CreateCurrency(payload) {
    try {
      const { name, locale } = payload;
      // await CurrencyModel.deleteMany({});
      const currency = new CurrencyModel({
        name,
        locale,
      });
      const result = await currency.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateCharge(payload) {
    try {
      const { code, name, type, value } = payload;
      // await CurrencyModel.deleteMany({});
      // CHeck if charge already exist
      const checkCharge = await ChargeModel.find({ code: code });

      if (checkCharge && checkCharge.length) {
        return checkCharge;
      } else {
        const charge = new ChargeModel({
          code,
          name,
          type,
          value,
        });
        const result = await charge.save();
        return result;
      }
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateFaq(payload) {
    try {
      const { question, answer, order } = payload;
      // await CurrencyModel.deleteMany({});
      // CHeck if charge already exist
      const faq = new FaqModel({ question, answer, order });
      const result = await faq.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
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
        visible,
      } = payload;
      const _product = await ProductModel.findById(_id);
      if (_product && _product._producer.equals(_producer)) {
        _product.name = name;
        _product.desc = desc;
        _product.price = price;
        _product.qty = qty;
        _product._returnPolicy = _returnPolicy;
        _product._estimatedPickup = _estimatedPickup;
        _product.visible = visible;

        //Check if image is uploaded or from file
        if (product_image.image) {
          _product.image = product_image.image;
          // _product.visible = false;
        } else if (product_image.image_id) {
          const sku_gallery = await SkuGalleryModel.findById(
            product_image.image_id
          );
          if (sku_gallery) {
            _product.image = sku_gallery.image;
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

  async ProductsByProducer(_producer) {
    try {
      const q = { deleted: false };
      if (_producer) {
        q._producer = mongoose.Types.ObjectId(_producer);
      }

      const data = await ProductModel.find(q)
        .sort({ createdAt: -1 })
        .populate("_currency _producer _returnPolicy");

      return data;
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async FindById(_producer) {
    try {
      const q = { deleted: false };

      q._id = mongoose.Types.ObjectId(_producer);

      const data = await ProductModel.find(q).populate(
        "_currency _producer _returnPolicy"
      );

      return data;
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async CreateGallery(payload) {
    try {
      const { title, description, image } = payload;

      // SkuGalleryModel.remove();
      const product = new SkuGalleryModel({
        title,
        description,
        image,
      });
      const result = await product.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
  async GetGallery(payload) {
    try {
      // SkuGalleryModel.remove();
      const result = await SkuGalleryModel.find();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
  

  async GetAllCustomers(type = null) {
    try {
      if (type) {
        const existingCustomer = await CustomerModel.find({
          user_type: type,
        }).populate("address _producer");
        // .popuplate('_producer');
        return existingCustomer;
      } else {
        const existingCustomer = await CustomerModel.find().populate(
          "address _producer"
        );
        // .popuplate('_producer');
        return existingCustomer;
      }

      // .populate('wishlist')
      // .populate('orders')
      // .populate('cart.product');
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetAllOrders() {
    try {
      const existingOrder = await OrderDetailsModel.find();
      // .popuplate('_producer');
      return existingOrder;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateReturnPolicy(payload) {
    try {
      const { name, code } = payload;
      // await CurrencyModel.deleteMany({});
      // CHeck if charge already exist
      const returnPolicy = new ReturnPolicyModel({ name, code });
      const result = await returnPolicy.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async FindProducerUser({ email, password }) {
    try {
      const existingProducer = await CustomerModel.findOne({
        email,
        password,
      });
      return existingProducer;
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Producer"
      );
    }
  }

  async AdminLogin(payload) {
    try {
      const { email, password } = payload;
      const existingProducer = await this.FindProducerUser({
        email,
        password,
      });
      ("");

      if (
        existingProducer &&
        existingProducer.status &&
        existingProducer.user_type &&
        existingProducer.user_type == "admin"
      ) {
        const tokens = await GenerateSignature({
          _id: existingProducer._id,
          password: existingProducer.password,
        });

        return FormateData({ user: existingProducer, tokens });
      } else {
        throw new APIError("", STATUS_CODES.INTERNAL_ERROR, "Admin Not Found");
      }
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
}

module.exports = AdminRepository;
