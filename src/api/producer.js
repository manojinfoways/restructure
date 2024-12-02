const { check, oneOf, validationResult } = require("express-validator");
const ProducerService = require("../services/producer-service");
const ProductService = require("../services/product-service");

const UserAuth = require("./middlewares/auth");
const IsProducer = require("./middlewares/producer-auth");
const {
  APIError,
  BadRequestError,
  ValidationError,
} = require("../utils/app-errors");
const { ValidateLatLong, ValidateSignature } = require("../utils");
const upload = require("../utils/image-upload");
const ReturnPolicyServices = require("../services/returnPolicy-services");

module.exports = (app) => {
  const service = new ProducerService();
  const product_service = new ProductService();
  const returnPolicy_services = new ReturnPolicyServices();

  app.post(
    "/stores",
    UserAuth,

    check("latitude")
      .notEmpty()
      .custom((value) => {
        return ValidateLatLong({ lat: value }).then((lat) => {
          if (!lat) {
            return Promise.reject("Invalid Latitude");
          }
        });
      }),
    check("longitude")
      .notEmpty()
      .custom((value) => {
        return ValidateLatLong({ long: value }).then((long) => {
          if (!long) {
            return Promise.reject("Invalid Longitude");
          }
        });
      }),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const { latitude, longitude } = req.body;

        const { data } = await service.GetProducers({ latitude, longitude });

        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/store/products",
    UserAuth,

    oneOf([
      check("store_id").notEmpty().withMessage("store_id is required"),
      [
        check("latitude").custom((value) => {
          return ValidateLatLong({ lat: value }).then((lat) => {
            if (!lat) {
              return Promise.reject("Invalid Latitude");
            }
          });
        }),
        check("longitude").custom((value) => {
          return ValidateLatLong({ long: value }).then((long) => {
            if (!long) {
              return Promise.reject("Invalid Longitude");
            }
          });
        }),
      ],
    ]),

    // check('offset').notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const { store_id, next_cursor, previous_cursor } = req.body;
        const { latitude, longitude } = req.body;
        const user_id = req.user._id;

        if (store_id) {
          const data = await service.GetProductsByProducer({
            store_id,
            next_cursor,
            previous_cursor,
            user_id,
          });
          return res.json(data);
        } else {
          const data = await service.GetProductsByDistance({
            latitude,
            longitude,
            next_cursor,
            previous_cursor,
            user_id,
          });
          return res.json(data);
        }
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/store/product/:id",
    UserAuth,

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const _id = req.params.id;
        const user_id = req.user._id;

        const data = await product_service.GetProductDescription(_id, {
          user_id,
        });

        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/store/login",

    check("fb_id").notEmpty(),
    check("fcm_id").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const { fb_id, device_id, fcm_id } = req.body;

        const data = await service.SignIn({ fb_id, device_id, fcm_id });

        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/store/refresh-token",

    async (req, res, next) => {
      try {
        const isAuthorized = await ValidateSignature(req, true);

        if (isAuthorized && req.user && req.user._id) {
          const data = await service.RefreshTokens(req.user._id);
          return res.json(data);
        } else {
          return res
            .status(419)
            .json({ statusCode: 419, message: "Invalid Token" });
        }
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    "/store/sku_gallery",
    IsProducer,

    async (req, res, next) => {
      try {
        const payload = req.body;

        const data = await service.GetGallery(payload);
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/store/inventory/create",
    IsProducer,

    async (req, res, next) => {
      try {
        const imageUpload = upload.single("image");

        req.upload_dir = "product";

        imageUpload(req, res, async function (err) {
          try {
            await check("name").notEmpty().run(req);
            await check("desc").notEmpty().run(req);
            await check("price").notEmpty().run(req);
            await check("qty").notEmpty().run(req);

            if (err) {
              throw new ValidationError("Image Upload Error", err.message);
            } else {
              const errors = validationResult(req);
              if (!errors.isEmpty()) {
                throw new ValidationError("Data Not found", errors.array());
              }
              // return res.json({});
              const product_image = {};
              if (req.file) {
                product_image.image = req.file.key;
              } else if (req.body.image_id) {
                product_image.image_id = req.body.image_id;
              } else {
                throw new ValidationError("Data Not found", [
                  {
                    msg: "Please provide image",
                    param: "image / image_id",
                    location: "body",
                  },
                ]);
              }
              const _producer = req.profile._producer._id;
              const _creator = req.profile._id;
              // AddProducers
              const {
                name,
                desc,
                price,
                qty,
                _returnPolicy,
                _estimatedPickup,
              } = req.body;

              const data = await service.CreateProduct({
                name,
                desc,
                product_image,
                price,
                qty,
                _producer,
                _creator,
                _returnPolicy,
                _estimatedPickup,
              });
              return res.json(data);
            }
          } catch (err) {
            console.log(err);
            next(err);
          }
        });
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/store/inventory/view",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;
        const payload = req.body;
        payload.producer_id = _producer._id;

        const data = await service.GetProductsByProducer(payload, _producer);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/store/inventory/details/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile;

        const _id = req.params.id;

        const data = await product_service.GetProductDescription(
          _id,
          _producer
        );
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.put(
    "/store/inventory/update/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        const imageUpload = upload.single("image");

        req.upload_dir = "product";

        imageUpload(req, res, async function (err) {
          try {
            await check("name").notEmpty().run(req);
            await check("desc").notEmpty().run(req);
            await check("price").notEmpty().run(req);
            await check("qty").notEmpty().run(req);
            await check("id").notEmpty().run(req);

            if (err) {
              throw new ValidationError("Image Upload Error", err.message);
            } else {
              const errors = validationResult(req);
              if (!errors.isEmpty()) {
                throw new ValidationError("Data Not found", errors.array());
              }
              // return res.json({});
              const product_image = {};
              if (req.file) {
                product_image.image = req.file.key;
              } else if (req.body.image_id) {
                product_image.image_id = req.body.image_id;
              }
              const _producer = req.profile._producer._id;
              // AddProducers
              const {
                name,
                desc,
                price,
                qty,
                _returnPolicy = null,
                _estimatedPickup = null,
              } = req.body;
              const _id = req.params.id;

              const data = await service.UpdateProduct({
                _id,
                name,
                desc,
                product_image,
                price,
                qty,
                _producer,
                _returnPolicy,
                _estimatedPickup,
              });
              return res.json(data);
            }
          } catch (err) {
            console.log(err);
            next(err);
          }
        });
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.delete(
    "/store/inventory/delete/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer._id;

        const _id = req.params.id;

        const data = await service.DeleteProduct(_id, _producer);
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/store/orders",
    IsProducer,

    check("status").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const _producer = req.profile._producer;
        const payload = req.body;

        const data = await service.GetOrders(_producer, payload);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    "/store/order/details/:id",
    IsProducer,

    check("status").notEmpty(),
    // check('order_id').notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const _producer = req.profile._producer;
        const payload = req.body;
        payload.order_id = req.params.id;
        // console.log(payload);

        const data = await service.GetOrders(_producer, payload);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    "/store/order/status_update",
    IsProducer,

    check("status")
      .notEmpty()
      .isIn([
        "confirmed",
        "ready",
        "shipped",
        "cancelled",
        "returned",
        "replaced",
      ]),
    check("order_items_id").isArray({ min: 1 }),

    async (req, res, next) => {
      try {
        if (req.body && req.body.status == "cancelled") {
          await check("reason").notEmpty().run(req);
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const _producer = req.profile;
        const payload = req.body;

        const data = await service.UpdateOrderStatus(_producer, payload);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get("/store/profile", IsProducer, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const data = await service.GetProfile({ _id });
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.post(
    "/store/profile/update",
    IsProducer,

    async (req, res, next) => {
      try {
        const imageUpload = upload.single("image");

        req.upload_dir = "profile";

        imageUpload(req, res, async function (err) {
          try {
            if (err) {
              throw new ValidationError("Image Upload Error", err.message);
            } else {
              await check("first_name").notEmpty().run(req);
              await check("last_name").notEmpty().run(req);
              await check("latitude")
                .notEmpty()
                .custom((value) => {
                  return ValidateLatLong({ lat: value }).then((lat) => {
                    if (!lat) {
                      return Promise.reject("Invalid Latitude");
                    }
                  });
                })
                .run(req);
              await check("longitude")
                .notEmpty()
                .custom((value) => {
                  return ValidateLatLong({ long: value }).then((long) => {
                    if (!long) {
                      return Promise.reject("Invalid Longitude");
                    }
                  });
                })
                .run(req);
              await check("address").notEmpty().run(req);
              await check("zip_code").notEmpty().run(req);

              const errors = validationResult(req);
              if (!errors.isEmpty()) {
                throw new ValidationError("Data Not found", errors.array());
              }
              // return res.json({});
              const image = req.file ? req.file.key : null;

              const {
                first_name,
                last_name,
                latitude,
                longitude,
                address,
                zip_code,
                city,
                state,
                country,
              } = req.body;
              const address_line = address;

              const { _id } = req.user;
              const data = await service.UpdateProfile(_id, {
                first_name,
                last_name,
                latitude,
                longitude,
                address_line,
                zip_code,
                image,
                city,
                state,
                country,
              });
              return res.json(data);
            }
          } catch (err) {
            console.log(err);
            next(err);
          }
        });
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.get(
    "/store/cancellation_reasons",
    IsProducer,

    async (req, res, next) => {
      try {
        const reasons = ["Product not available", "Address not deliverable"];
        const data = { statusCode: 200, data: reasons };
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/store/customers",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;
        const payload = req.body;

        const data = await service.GetCustomers(_producer, payload);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/store/claims",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;
        const payload = req.body;

        const data = await service.GetClaims(_producer, payload);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/store/customers_products/",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;

        const data = await service.GetCustomersProducts(_producer);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    "/store/offer/create",
    IsProducer,

    // check('title').notEmpty(),
    check("offerPercentage").notEmpty(),
    check("status").notEmpty(),
    check("customers").isArray(),
    check("products").isArray(),

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;
        const {
          title,
          offerPercentage,
          status,
          customers,
          products,
          startDate,
          endDate,
        } = req.body;

        const data = await service.CreateOffer(_producer, {
          title,
          offerPercentage,
          status,
          customers,
          products,
          startDate,
          endDate,
        });
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/store/offers",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;

        const data = await service.GetOffers(_producer);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/store/offer/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;
        const _id = req.params.id;

        const data = await service.GetOfferById(_producer, _id);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.put(
    "/store/offer/update/:id",
    IsProducer,

    check("offerPercentage").notEmpty(),
    check("status").notEmpty(),
    check("customers").isArray(),
    check("products").isArray(),

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;
        const {
          title,
          offerPercentage,
          status,
          customers,
          products,
          startDate,
          endDate,
        } = req.body;
        const _id = req.params.id;
        const data = await service.UpdateOffer(_producer, _id, {
          title,
          offerPercentage,
          status,
          customers,
          products,
          startDate,
          endDate,
        });
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.delete(
    "/store/offer/remove/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer;
        const _id = req.params.id;

        const data = await service.RemoveOffer(_producer, _id);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get("/store/notifications", IsProducer, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const data = await service.GetNotifications(_id);
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get("/store/notification/:id", IsProducer, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const notification_id = req.params.id;
      const data = await service.ReadNotification(_id, notification_id);
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.delete(
    "/store/account",
    IsProducer,

    check("reason").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const { reason } = req.body;
        const user_id = req.user._id;

        const data = await service.RemoveProfile(user_id, reason);

        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  /*----------------------Return Policy ------------------------*/

  app.get("/store/returnpolicy/get", IsProducer, async (req, res, next) => {
    try {
      const { data } = await returnPolicy_services.GetAllReturnPolicy();
      return res.json(data);
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  /*----------------------Estimated Pickup ------------------------*/

  app.get("/store/estimatedpickup/get", IsProducer, async (req, res, next) => {
    try {
      const _producer = req.profile._producer;
      const { data } = await returnPolicy_services.getAllEstimatedPickup(
        _producer
      );
      return res.json(data);
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  app.post(
    "/store/estimatedpickup/create",
    IsProducer,

    check("title").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const _producer = req.profile._producer;

        const { title } = req.body;

        const data = await returnPolicy_services.CreateEstimatedPickupLookup({
          title,
          _producer,
        });
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.put(
    "/store/estimatedpickup/update/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        await check("title").notEmpty().run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        // return res.json({});
        const _producer = req.profile._producer._id;
        // AddProducers
        const { title } = req.body;
        const _id = req.params.id;

        const data = await returnPolicy_services.UpdateEstimatedPickupLookup({
          _id,
          _producer,
          title,
        });
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.delete(
    "/store/estimatedpickup/delete/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer._id;
        const _id = req.params.id;

        const data = await returnPolicy_services.DeleteEstimatedPickupLookup(
          _id,
          _producer
        );
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  /*----------------------Reson Lookup------------------------*/

  app.get("/store/reason/get/:type", IsProducer, async (req, res, next) => {
    try {
      const _producer = req.profile._producer;
      const type = req.params.type;
      const { data } = await returnPolicy_services.GetReasoLookup(
        _producer,
        type
      );
      return res.json(data);
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  app.post(
    "/store/reason/create",
    IsProducer,

    check("title").notEmpty(),
    check("type")
      .notEmpty()
      .isIn(["RP", "RT"])
      .withMessage("Invalid Type. Must be one of: RP,RT"),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const _producer = req.profile._producer;

        const { title, type } = req.body;

        const data = await returnPolicy_services.CreateReasonLookup({
          title,
          type,
          _producer,
        });
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.put(
    "/store/reason/update/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        await check("title").notEmpty().run(req);
        await check("type")
          .notEmpty()
          .isIn(["RP", "RT"])
          .withMessage("Invalid Type. Must be one of: RP,RT");

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        // return res.json({});
        const _producer = req.profile._producer._id;
        // AddProducers
        const { title, type } = req.body;
        const _id = req.params.id;

        const data = await returnPolicy_services.UpdateReasonLookup({
          _id,
          _producer,
          title,
          type,
        });
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.delete(
    "/store/reason/delete/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        const _producer = req.profile._producer._id;
        const _id = req.params.id;

        const data = await returnPolicy_services.DeleteReasonLookup(
          _id,
          _producer
        );
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  /*----------------------Return Replace Item------------------------*/

  app.post(
    "/store/returnreplace/create",
    IsProducer,

    check("_order").notEmpty(),
    check("_product").notEmpty(),
    check("type")
      .notEmpty()
      .isIn(["RP", "RT"])
      .withMessage("Invalid Type. Must be one of: RP,RT"),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const _producer = req.profile._producer;

        const {
          type,
          _order,
          _product,
          _reason = null,
          text = null,
        } = req.body;

        const data = await returnPolicy_services.createReturnReplaceRequest({
          type,
          _producer,
          _order,
          _product,
          _reason,
          text,
        });
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.put(
    "/store/returnReplace/update/:id",
    IsProducer,

    async (req, res, next) => {
      try {
        await check("_agent").notEmpty().run(req);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        // return res.json({});
        const _producer = req.profile._producer._id;
        // AddProducers
        const { _agent } = req.body;
        const _id = req.params.id;

        const data = await returnPolicy_services.UpdateReturnReplaceRequest({
          _id,
          _producer,
          _agent,
        });
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );
};
