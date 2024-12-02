const {
  ProducerRepository,
  ProductRepository,
  ShoppingRepository,
  CustomerRepository,
} = require("../database");
const { FormateData, GenerateSignature } = require("../utils");
const {
  APIError,
  BadRequestError,
  STATUS_CODES,
} = require("../utils/app-errors");

// All Business logic will be here
class ProducerService {
  constructor() {
    this.repository = new ProducerRepository();
    this.product_repository = new ProductRepository();
    this.shopping_repository = new ShoppingRepository();
    this.user_repository = new CustomerRepository();
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
        existingProducer.user_type &&
        existingProducer.user_type == "producer"
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
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      throw new APIError("Data Not found", error_code, err);
    }
  }

  async RefreshTokens(user_id) {
    try {
      const existingCustomer = await this.user_repository.FindCustomerById({
        id: user_id,
      });

      if (existingCustomer && existingCustomer.status) {
        const tokens = await GenerateSignature({
          _id: existingCustomer._id,
          fcm_id: existingCustomer.fcm_id,
        });

        return FormateData({ user: existingCustomer, tokens });
      } else {
        throw new APIError("", STATUS_CODES.UN_AUTHORISED, "User Not Found");
      }
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetProducers(payload) {
    try {
      const orderResult = await this.repository.ProducersWithDistance(payload);
      return FormateData(orderResult);
    } catch (err) {
      throw new APIError("Data Not found", err);
    }
  }

  async GetProductsByProducer(payload, _producer = null) {
    try {
      if (payload.store_id) {
        payload.producer_id = payload.store_id;
      }
      const productResult = await this.product_repository.ProductsByProducer(
        payload,
        _producer
      );
      return FormateData(productResult);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetProductsByDistance(payload) {
    try {
      const producerResult = await this.repository.ProducersWithDistance(
        payload
      );
      if (producerResult && producerResult.data && producerResult.data.length) {
        const producer_data = producerResult.data;
        const producers_id = producer_data.map((element) => element.store_id);
        payload.producer_id = producers_id;
        const productResult = await this.product_repository.ProductsByProducer(
          payload
        );
        return FormateData(productResult);
      } else {
        return FormateData({ data: [] });
      }
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateProduct(payload) {
    const newProduct = await this.product_repository.CreateProduct(payload);
    return FormateData({ product: newProduct });
  }

  async UpdateProduct(payload) {
    const product = await this.product_repository.UpdateProduct(payload);
    return FormateData({ product: product });
  }

  async DeleteProduct(product_id, _producer) {
    const product = await this.product_repository.DeleteProduct(
      product_id,
      _producer
    );
    return FormateData({ product: product });
  }

  async GetOrders(producer, payload) {
    try {
      const orders = await this.shopping_repository.Orders(
        producer,
        payload,
        true
      );
      return FormateData(orders);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetCustomers(producer, payload) {
    try {
      const orders = await this.shopping_repository.GetCustomers(
        producer,
        payload,
        true
      );
      return FormateData(orders);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetClaims(producer, payload) {
    try {
      const orders = await this.shopping_repository.GetClaims(
        producer,
        payload,
        true
      );
      return FormateData(orders);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateOrderStatus(producer, payload) {
    try {
      const orders = await this.shopping_repository.UpdateOrderStatus(
        producer,
        payload
      );
      return FormateData(orders);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetGallery(payload) {
    try {
      const data = await this.repository.SkuGallery(payload);
      return FormateData(data);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetCustomersProducts(producer) {
    try {
      const data = await this.shopping_repository.GetCustomersProducts(
        producer
      );
      return FormateData(data);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async CreateOffer(producer, payload) {
    try {
      const data = await this.shopping_repository.CreateOffer(
        producer,
        payload
      );
      return FormateData(data);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async GetOffers(producer) {
    try {
      const data = await this.shopping_repository.GetOffers(producer);
      return FormateData(data);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async GetOfferById(producer, offerId) {
    try {
      const data = await this.shopping_repository.GetOfferById(
        producer,
        offerId
      );
      return FormateData(data);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async UpdateOffer(producer, offerId, payload) {
    try {
      const data = await this.shopping_repository.UpdateOffer(
        producer,
        offerId,
        payload
      );
      return FormateData(data);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async RemoveOffer(producer, offerId) {
    try {
      const data = await this.shopping_repository.RemoveOffer(
        producer,
        offerId
      );
      return FormateData(data);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async GetProfile(id, populate_data = null) {
    try {
      const existingUser = await this.user_repository.FindCustomerById(
        { id },
        false
      );

      return FormateData(existingUser);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateProfile(_id, payload) {
    try {
      const UpdateUser = await this.user_repository.UpdateUser(_id, payload);
      payload.address = payload.address_line;
      const address = await this.user_repository.UpdateAddressProducer(
        _id,
        payload
      );

      //Update Address
      // const

      return FormateData(UpdateUser);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetNotifications(_userId) {
    try {
      const notifications = await this.user_repository.GetNotifications(
        _userId
      );
      return FormateData(notifications);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async ReadNotification(_userId, notification_id) {
    try {
      const notifications = await this.user_repository.ReadNotification(
        _userId,
        notification_id
      );
      return FormateData(notifications);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async RemoveProfile(_id, reason) {
    try {
      const RemoveCustomer = await this.user_repository.RemoveUser(_id, reason);

      return FormateData(RemoveCustomer);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
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
}

module.exports = ProducerService;
