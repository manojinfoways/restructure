const { AdminRepository } = require("../database");
const { FormateData, GenerateSignature } = require("../utils");
const {
  APIError,
  BadRequestError,
  STATUS_CODES,
} = require("../utils/app-errors");

// All Business logic will be here
class AdminService {
  constructor() {
    this.repository = new AdminRepository();
  }

  async SignIn(userInputs) {
    const { fb_id, device_id, fcm_id } = userInputs;

    try {
      const existingProducer = await this.repository.FindProducerUser({
        fb_id,
      });

      if (
        existingProducer &&
        existingProducer.status &&
        existingProducer.user_type
      ) {
        await this.repository.UpdateProducerUser(existingProducer._id, {
          device_id,
          fcm_id,
        });
        const userProfile = await this.repository.FindProducerUserById({
          id: existingProducer._id,
        });

        const tokens = await GenerateSignature({
          _id: userProfile._id,
          fcm_id: userProfile.fcm_id,
        });

        return FormateData({ user: userProfile, tokens });
      } else {
        throw new APIError(
          "",
          STATUS_CODES.INTERNAL_ERROR,
          "Producer Not Found"
        );
      }
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async AddProducers(payload) {
    const { name, desc, banner, icon, status } = payload;
    const newProducer = await this.repository.CreateProducer({
      name,
      desc,
      banner,
      icon,
      status,
    });
    return FormateData(newProducer);
  }

  async updateProducers(payload) {
    const producer = await this.repository.UpdateProducerDetails(payload);
    return FormateData({ producer: producer });
  }

  async AssignUserToProducer(payload) {
    const { producer_id, user_id } = payload;
    const producer = await this.repository.AssignUserToProducer({
      producer_id,
      user_id,
    });
    return FormateData(producer);
  }

  async MakeAgent(payload) {
    const { user_id } = payload;
    const producer = await this.repository.MakeAgent(user_id);
    return FormateData(producer);
  }

  async switchFbIds(payload) {
    const producer = await this.repository.switchFbIds(payload);
    return FormateData(producer);
  }

  async GetProducers(payload) {
    try {
      const orderResult = await this.repository.ProducersWithDistance(payload);
      return FormateData(orderResult);
    } catch (err) {
      throw new APIError("Data Not found", err);
    }
  }

  async CreateCurrency(payload) {
    const newCurrency = await this.repository.CreateCurrency(payload);
    return FormateData(newCurrency);
  }

  async CreateCharge(payload) {
    const newCharge = await this.repository.CreateCharge(payload);
    return FormateData(newCharge);
  }

  async CreateFaq(payload) {
    const newCharge = await this.repository.CreateFaq(payload);
    return FormateData(newCharge);
  }

  async SubscribeEvents(payload) {
    const { event, data } = payload;

    const { userId, product, order, qty } = data;

    switch (event) {
      case "ADD_TO_WISHLIST":
      case "REMOVE_FROM_WISHLIST":
        this.AddToWishlist(userId, product);
        break;
      case "ADD_TO_CART":
        this.ManageCart(userId, product, qty, false);
        break;
      case "REMOVE_FROM_CART":
        this.ManageCart(userId, product, qty, true);
        break;
      case "CREATE_ORDER":
        this.ManageOrder(userId, order);
        break;
      default:
        break;
    }
  }

  async CreateProduct(payload) {
    const newProduct = await this.repository.CreateProduct(payload);
    return FormateData({ product: newProduct });
  }

  async UpdateProduct(payload) {
    const product = await this.repository.UpdateProduct(payload);
    return FormateData({ product: product });
  }

  async GetProductsByProducer(payload, _producer) {
    try {
      const productResult = await this.repository.ProductsByProducer(
        payload,
        _producer
      );
      return FormateData(productResult);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetProductDescription(payload) {
    try {
      const product = await this.repository.FindById(payload);
      return FormateData(product);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async CreateGallery(payload) {
    const newGallery = await this.repository.CreateGallery(payload);
    return FormateData(newGallery);
  }

  async GetAllCustomers(type) {
    try {
      const existingCustomer = await this.repository.GetAllCustomers(type);
      return FormateData(existingCustomer);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetAllOrders() {
    try {
      const existingOrder = await this.repository.GetAllOrders();
      return FormateData(existingOrder);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateReturnPolicy(payload) {
    const newReturnPolicy = await this.repository.CreateReturnPolicy(payload);
    return FormateData(newReturnPolicy);
  }
  async AdminLogin(payload) {
    const adminLogin = await this.repository.AdminLogin(payload);
    return FormateData(adminLogin);
  }
}

module.exports = AdminService;
