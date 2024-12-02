const { check, validationResult } = require("express-validator");
const CustomerService = require("../services/customer-service");
const UserAuth = require("./middlewares/auth");
const { ValidationError } = require("../utils/app-errors");
const { ValidateLatLong, ValidateSignature } = require("../utils");
const upload = require("../utils/image-upload");
const ReturnPolicyServices = require("../services/returnPolicy-services");

module.exports = (app) => {
  const service = new CustomerService();
  const returnPolicy_services = new ReturnPolicyServices();

  app.get("/privacy_policy", async (req, res, next) => {
    try {
      const data = {
        statusCode: 200,
        data: { url: "https://order-up.in/privacy.html" },
      };
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get("/terms_condition", async (req, res, next) => {
    try {
      const data = {
        statusCode: 200,
        data: { url: "https://order-up.in/terms.html" },
      };
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get("/faqs", async (req, res, next) => {
    try {
      const data = await service.GetFaqs();
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get("/remove_account_reasons", async (req, res, next) => {
    try {
      const reasons = [
        "I am not using this account anymore",
        "Account concerns / Unauthorised activity",
        "Privacy concers",
      ];
      const data = { statusCode: 200, data: reasons };
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.post(
    "/customer/register",

    check("fb_id").notEmpty(),
    check("email").isEmail(),
    check("phone").notEmpty(),
    check("first_name").notEmpty(),
    check("last_name").notEmpty(),
    check("signup_type").notEmpty(),
    check("fcm_id").notEmpty(),
    check("device").notEmpty(),
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
        var {
          fb_id,
          email,
          phone,
          first_name,
          last_name,
          gender,
          version,
          signup_type,
          device_id,
          fcm_id,
          device,
          latitude,
          longitude,
        } = req.body;

        const user_type = "consumer";
        // const user_type = 'producer';
        // const email = email;
        // const phone = mobile;
        gender = gender ? gender : "";
        version = version ? version : "";
        device_id = device_id ? device_id : "";
        const address_line = req.body.address ? req.body.address : "";
        const zip_code = req.body.zip_code ? req.body.zip_code : "";
        const address = {
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email: req.body.email,
          phone: req.body.phone,
          house_no: req.body.house_no ? req.body.house_no : null,
          address: req.body.address ? req.body.address : "",
          street: req.body.street ? req.body.street : "",
          zip_code: req.body.zip_code ? req.body.zip_code : "",
          city: req.body.city ? req.body.city : "",
          state: req.body.state ? req.body.state : "",
          country: req.body.country ? req.body.country : "",
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          type: "home",
          is_default: true,
        };

        // const data = {};

        const data = await service.SignUp({
          fb_id,
          email,
          phone,
          first_name,
          last_name,
          gender,
          version,
          signup_type,
          device_id,
          fcm_id,
          device,
          latitude,
          longitude,
          address_line,
          zip_code,
          user_type,
          address,
        });
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    "/customer/login",

    check("fb_id").notEmpty(),
    check("fcm_id").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }
        const {
          fb_id,
          device_id,
          fcm_id,
          is_guest,
          old_token,
          version,
          device,
          latitude,
          longitude,
        } = req.body;

        const data = await service.SignIn({
          fb_id,
          device_id,
          fcm_id,
          is_guest,
          old_token,
          version,
          device,
          latitude,
          longitude,
        });

        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/customer/refresh-token",

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

  // app.use(UserAuth);

  app.post(
    "/customer/address/add",
    UserAuth,

    check("first_name").notEmpty(),
    check("last_name").notEmpty(),
    check("email").isEmail(),
    check("phone").notEmpty(),
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
    check("address").notEmpty(),
    check("city").notEmpty(),
    check("state").notEmpty(),
    check("country").notEmpty(),
    check("zip_code").notEmpty(),
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }

        const { _id } = req.user;
        // const  _id  =  '63de9d5880ea210a876e4588';

        const {
          first_name,
          last_name,
          email,
          phone,
          house_no,
          address,
          street,
          zip_code,
          city,
          state,
          country,
          latitude,
          longitude,
        } = req.body;

        const type =
          req.body.type && req.body.type == "office" ? "office" : "home";
        const is_default =
          req.body.is_default && req.body.is_default == true ? true : false;

        const data = await service.AddNewAddress(_id, {
          first_name,
          last_name,
          email,
          phone,
          house_no,
          address,
          street,
          zip_code,
          city,
          state,
          country,
          latitude,
          longitude,
          type,
          is_default,
        });

        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.put(
    "/customer/address/update/:id",
    UserAuth,
    check("first_name").notEmpty(),
    check("last_name").notEmpty(),
    check("email").isEmail(),
    check("phone").notEmpty(),
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
    check("address").notEmpty(),
    check("city").notEmpty(),
    check("state").notEmpty(),
    check("country").notEmpty(),
    check("zip_code").notEmpty(),
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }

        const { _id } = req.user;

        const {
          first_name,
          last_name,
          email,
          phone,
          house_no,
          address,
          street,
          zip_code,
          city,
          state,
          country,
          latitude,
          longitude,
        } = req.body;
        const address_id = req.params.id;

        const type =
          req.body.type && req.body.type == "office" ? "office" : "home";
        const is_default =
          req.body.is_default && req.body.is_default == true ? true : false;

        const data = await service.UpdateAddress(_id, address_id, {
          first_name,
          last_name,
          email,
          phone,
          house_no,
          address,
          street,
          zip_code,
          city,
          state,
          country,
          latitude,
          longitude,
          type,
          is_default,
        });

        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.delete(
    "/customer/address/delete/:id",
    UserAuth,

    async (req, res, next) => {
      try {
        const { _id } = req.user;

        const address_id = req.params.id;

        const data = await service.RemoveAddress(_id, address_id);

        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get("/customer/address", UserAuth, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const data = await service.GetProfile({ _id }, "address");
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get("/customer/address/:id", UserAuth, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const address_id = req.params.id;
      const data = await service.GetAddressDetails(_id, address_id);
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get("/customer/profile", UserAuth, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const data = await service.GetProfile({ _id });
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.post(
    "/customer/profile/update",
    UserAuth,

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

  app.get("/customer/shoping-details", UserAuth, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const { data } = await service.GetShopingDetails(_id);

      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.delete(
    "/customer/account",
    UserAuth,

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

  app.get("/customer/notifications", UserAuth, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const data = await service.GetNotifications(_id);
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get("/customer/notification/:id", UserAuth, async (req, res, next) => {
    try {
      const { _id } = req.user;
      const notification_id = req.params.id;
      const data = await service.ReadNotification(_id, notification_id);
      return res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // app.get('/customer/wishlist', UserAuth, async (req,res,next) => {
  //     try {
  //         const { _id } = req.user;
  //         const { data } = await service.GetWishList( _id);
  //         return res.status(200).json(data);

  //     } catch (err) {
  //         next(err)
  //     }
  // });

  app.get("/customer/reason/get/:id", UserAuth, async (req, res, next) => {
    try {
      const _producer = req.params.id;
      const { data } = await returnPolicy_services.GetReasoLookup(_producer);
      return res.json(data);
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  app.post(
    "/customer/order/status_update",
    UserAuth,

    check("status")
      .notEmpty()
      .isIn(["cancelled", "return_requested", "replace_requested"]),
    check("reason").notEmpty(),
    check("_order").notEmpty(),
    check("_orderItem").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }

        const { _id } = req.user;
        const { status, reason, _order, _orderItem } = req.body;

        console.log("");

        const data = await service.UpdateOrderStatus({
          _id,
          status,
          reason,
          _order,
          _orderItem,
        });
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );
};
