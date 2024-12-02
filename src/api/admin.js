const { check, validationResult, body } = require("express-validator");
const AdminService = require("../services/admin-service");
const AdminAuth = require("./middlewares/admin-auth");
const {
  APIError,
  BadRequestError,
  ValidationError,
} = require("../utils/app-errors");
const { ValidateLatLong } = require("../utils");
const upload = require("../utils/image-upload");
const { CustomerModel, ProducerModel } = require("../database/models");

module.exports = (app) => {
  const service = new AdminService();

  app.post(
    "/admin/store/create",
    AdminAuth,

    async (req, res, next) => {
      try {
        // const imageUpload = upload.single("image");
        const bannerUpload = upload.fields([
          { name: "image" },
          { name: "banner" },
        ]);

        req.upload_dir = "producer";
        req.sub_dir = {
          image: "icon",
          banner: "banner",
        };

        // req.sub_dir.banner = 'banners';
        bannerUpload(req, res, async function (err) {
          try {
            check("name").notEmpty();
            check("desc").notEmpty();
            if (err) {
              throw new ValidationError("Image Upload Error", err.message);
            } else {
              const errors = validationResult(req);
              if (!errors.isEmpty()) {
                throw new ValidationError("Data Not found", errors.array());
              }

              const { name, desc, status = true } = req.body;
              const banner = req.files.banner[0].key;
              const icon = req.files.image[0].key;
              // AddProducers
              const { data } = await service.AddProducers({
                name,
                desc,
                banner,
                icon,
                status,
              });
              //63dac709a0e566621f2a2307
              //63dac9dbe1d7501608bc09ea //user
              // var file_path = req.file.key;
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

  app.put(
    "/admin/store/update/:id",
    AdminAuth,

    async (req, res, next) => {
      try {
        const bannerUpload = upload.fields([
          { name: "image" },
          { name: "banner" },
        ]);

        req.upload_dir = "producer";
        req.sub_dir = {
          image: "icon",
          banner: "banner",
        };

        bannerUpload(req, res, async function (err) {
          try {
            await check("name").notEmpty().run(req);
            await check("desc").notEmpty().run(req);
            await check("status").notEmpty().run(req);

            if (err) {
              throw new ValidationError("Image Upload Error", err.message);
            } else {
              const errors = validationResult(req);
              if (!errors.isEmpty()) {
                throw new ValidationError("Data Not found", errors.array());
              }
              // return res.json({});
              let banner = null;
              let icon = null;

              if (req.files.banner) {
                banner = req.files?.banner[0].key;
              }
              if (req.files.image) {
                icon = req.files?.image[0].key;
              }

              const { name, desc, status } = req.body;
              const _id = req.params.id;

              const data = await service.updateProducers({
                _id,
                name,
                desc,
                status,
                banner,
                icon,
              });
              return res.json(data);
            }
          } catch (err) {
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
    "/admin/store/assign_user",
    AdminAuth,

    async (req, res, next) => {
      try {
        const { producer_id, user_id } = req.body;

        if (producer_id && user_id) {
          const { data } = await service.AssignUserToProducer({
            producer_id,
            user_id,
          });
          return res.json(data);
        } else {
          return res.json([]);
        }

        // const user_id = '';
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/admin/user/make_agent",
    AdminAuth,

    async (req, res, next) => {
      try {
        const { user_id } = req.body;

        if (user_id) {
          const { data } = await service.MakeAgent({ user_id });
          return res.json(data);
        } else {
          return res.json([]);
        }

        // const user_id = '';
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/admin/user/updat_fb_id",
    AdminAuth,

    async (req, res, next) => {
      try {
        const { fb_id, new_fb_id } = req.body;

        if (fb_id && new_fb_id) {
          const { data } = await service.switchFbIds({ fb_id, new_fb_id });
          return res.json(data);
        } else {
          return res.json([]);
        }

        // const user_id = '';
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/admin/currency/create",
    AdminAuth,

    check("name").notEmpty(),
    check("locale").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }

        const { name, locale } = req.body;
        const { data } = await service.CreateCurrency({ name, locale });

        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/admin/charge/create",
    AdminAuth,

    check("code").notEmpty(),
    check("name").notEmpty(),
    check("type").notEmpty(),
    check("value").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }

        const { code, name, type, value } = req.body;
        const { data } = await service.CreateCharge({
          code,
          name,
          type,
          value,
        });

        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/admin/gallery/create",
    AdminAuth,

    async (req, res, next) => {
      try {
        const imageUpload = upload.single("image");

        req.upload_dir = "gallery";

        imageUpload(req, res, async function (err) {
          try {
            check("title").notEmpty();
            check("description").notEmpty();

            if (err) {
              throw new ValidationError("Image Upload Error", err.message);
            } else {
              const errors = validationResult(req);
              if (!errors.isEmpty()) {
                throw new ValidationError("Data Not found", errors.array());
              }
              const image = req.file.key;

              const { title, description } = req.body;

              const data = await service.CreateGallery({
                title,
                description,
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

  app.get(
    "/admin/gallery",
    AdminAuth,

    async (req, res, next) => {
      try {
          try {
              const data = await service.GetGallery(); 
              return res.json(data);
             
          } catch (err) {
            console.log(err);
            next(err);
          }
         
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/admin/faq/create",
    AdminAuth,

    check("question").notEmpty(),
    check("answer").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }

        const { question, answer } = req.body;
        const order = req.body.order ? req.body.order : 0;
        const { data } = await service.CreateFaq({ question, answer, order });

        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.get("/admin/stores", AdminAuth, async (req, res, next) => {
    try {
      const payload = req.body;
      const { data } = await service.GetProducers(payload);

      return res.json(data);
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  app.get("/admin/users", AdminAuth, async (req, res, next) => {
    try {
      const user_type = req.body.user_type;
      const { data } = await service.GetAllCustomers(user_type);

      return res.json(data);
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  app.get("/admin/orders", AdminAuth, async (req, res, next) => {
    try {
      const { data } = await service.GetAllOrders();

      return res.json(data);
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  app.post(
    "/admin/returnpolicy/create",

    check("title").notEmpty(),
    check("code").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }

        const { title, code } = req.body;
        const data = await service.CreateReturnPolicy({ title, code });

        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  app.post(
    "/admin/login",

    check("email").notEmpty(),
    check("password").notEmpty(),

    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new ValidationError("Data Not found", errors.array());
        }

        const { email, password } = req.body;
        const data = await service.AdminLogin({ email, password });

        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );

  /* ------------------------------- Inventory Create ------------------------------- */

  app.post(
    "/admin/inventory/create",
    AdminAuth,

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
            await check("_producer").notEmpty().run(req);
            await check("_creator").notEmpty().run(req);
            await check("visible").notEmpty().run(req);

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
              // const _producer = req.profile._producer._id;
              // const _creator = req.profile._id;
              // AddProducers
              const {
                name,
                desc,
                price,
                qty,
                _returnPolicy,
                _estimatedPickup,
                _producer,
                _creator,
                visible,
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
                visible,
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

  app.put(
    "/admin/inventory/update/:id",
    AdminAuth,

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
            await check("visible").notEmpty().run(req);
            await check("_producer").notEmpty().run(req);

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
              // const _producer = req.profile._producer._id;

              // AddProducers
              const {
                name,
                desc,
                price,
                qty,
                _returnPolicy = null,
                _estimatedPickup = null,
                _producer,
                visible,
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
                visible,
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
    "/admin/inventory/view",
    AdminAuth,

    async (req, res, next) => {
      try {
        const _producer = req.query._producer ? req.query._producer : null;
        const payload = req.body;

        const data = await service.GetProductsByProducer(payload, _producer);
        return res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  app.get(
    "/admin/inventory/view/:id",
    AdminAuth,

    async (req, res, next) => {
      try {
        const _id = req.params.id;

        const data = await service.GetProductDescription(_id);
        return res.json(data);
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
  );
};
