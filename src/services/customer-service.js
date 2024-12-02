const { CustomerRepository, ShoppingRepository } = require("../database");
const { FormateData, GenerateSignature, ValidateToken } = require("../utils");
const {
  APIError,
  BadRequestError,
  STATUS_CODES,
} = require("../utils/app-errors");

// All Business logic will be here
class CustomerService {
  constructor() {
    this.repository = new CustomerRepository();
    this.shopping_repository = new ShoppingRepository();
  }

  async RefreshTokens(user_id) {
    try {
      const existingCustomer = await this.repository.FindCustomerById({
        id: user_id,
      });

      if (existingCustomer && existingCustomer.status) {
        const tokens = await GenerateSignature({
          _id: existingCustomer._id,
          fcm_id: existingCustomer.fcm_id,
        });

        return FormateData({ user: existingCustomer, tokens });
      } else {
        throw new APIError(
          "",
          STATUS_CODES.UN_AUTHORISED,
          "Customer Not Found"
        );
      }
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async SignIn(userInputs) {
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
    } = userInputs;

    try {
      if (is_guest) {
        const existingGuest = await this.repository.FindCustomer({ fb_id });

        if (!existingGuest) {
          const newCustomer = await this.repository.CreateCustomer({
            fb_id,
            email: "",
            phone: "",
            first_name: "",
            last_name: "",
            gender: "",
            version: version ? version : "",
            signup_type: "Guest",
            device_id,
            fcm_id,
            device: device ? device : "",
            latitude: latitude ? latitude : "",
            longitude: longitude ? longitude : "",
            address_line: "",
            zip_code: "",
            user_type: "consumer",
          });
        }
      }
      const existingCustomer = await this.repository.FindCustomer({ fb_id });

      if (existingCustomer && existingCustomer.status) {
        await this.repository.UpdateUser(existingCustomer._id, {
          device_id,
          fcm_id,
        });
        const userProfile = await this.repository.FindCustomerById({
          id: existingCustomer._id,
        });

        const tokens = await GenerateSignature({
          _id: userProfile._id,
          fcm_id: userProfile.fcm_id,
        });

        if (old_token) {
          //verify token
          const decoded_token = ValidateToken(old_token);
          if (
            decoded_token &&
            decoded_token._id &&
            decoded_token._id &&
            !userProfile._id.equals(decoded_token._id)
          ) {
            this.repository.SwitchCartItem(decoded_token._id, userProfile._id);
          }
        }

        return FormateData({ user: userProfile, tokens });
      } else {
        throw new APIError("", STATUS_CODES.BAD_REQUEST, "Customer Not Found");
      }
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      throw new APIError("Data Not found", error_code, err);
    }
  }

  async SignUp(userInputs) {
    const {
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
    } = userInputs;

    try {
      //Check if fb id alreday there
      const existingCustomer = await this.repository.FindCustomer({ fb_id });
      if (existingCustomer) {
        throw new APIError(
          "Customer Exist",
          STATUS_CODES.INTERNAL_ERROR,
          "fb id alreasy exist"
        );
      } else {
        const newCustomer = await this.repository.CreateCustomer({
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
        });

        await this.repository.CreateAddress(newCustomer._id, address);

        const userProfile = await this.repository.FindCustomerById({
          id: newCustomer._id,
        });

        const tokens = await GenerateSignature({
          _id: newCustomer._id,
          fcm_id: newCustomer.fcm_id,
        });

        return FormateData({ id: newCustomer._id, user: userProfile, tokens });
      }
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async AddNewAddress(_id, payload) {
    try {
      if (payload && payload.is_default) {
        await this.repository.RemoveDefaultAddress(_id);
      }
      const addressResult = await this.repository.CreateAddress(_id, payload);
      return FormateData(addressResult);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateAddress(_id, address_id, payload) {
    try {
      if (payload && payload.is_default) {
        await this.repository.RemoveDefaultAddress(_id);
      }
      const addressResult = await this.repository.UpdateAddress(
        _id,
        address_id,
        payload
      );
      return FormateData(addressResult);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async RemoveAddress(_id, address_id) {
    try {
      const addressResult = await this.repository.RemoveAddress(
        _id,
        address_id
      );
      return FormateData(addressResult, "remove");
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetProfile(id, populate_data = null) {
    try {
      const existingCustomer = await this.repository.FindCustomerById({ id });

      if (populate_data) {
        if (populate_data == "address") {
          return FormateData(existingCustomer.address);
        }
      } else {
        return FormateData(existingCustomer);
      }
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetNotifications(_userId) {
    try {
      const notifications = await this.repository.GetNotifications(_userId);
      return FormateData(notifications);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async ReadNotification(_userId, notification_id) {
    try {
      const notifications = await this.repository.ReadNotification(
        _userId,
        notification_id
      );
      return FormateData(notifications);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateProfile(_id, payload) {
    try {
      const UpdateCustomer = await this.repository.UpdateUser(_id, payload);

      return FormateData(UpdateCustomer);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetShopingDetails(id, customer_coordinate = null) {
    try {
      const existingCustomer = await this.repository.GetCart(
        id,
        customer_coordinate
      );

      if (existingCustomer) {
        const charges = await this.shopping_repository.GetCharges();

        // const cart = existingCustomer.cart
        const cart = existingCustomer;
        return FormateData({ cart, charges });
      }
      return FormateData({ msg: "Error" });
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
  async GetAddressDetails(id, address_id) {
    const existingAddress = await this.repository.VerifyAddress(id, address_id);
    if (existingAddress) {
      return FormateData(existingAddress);
    } else {
      throw new APIError(
        "API Error",
        STATUS_CODES.BAD_REQUEST,
        "Address Not Found"
      );
    }
  }

  async CheckShopingDetails(id, address_id) {
    try {
      id = id.toString();
      const existingAddress = await this.repository.VerifyAddress(
        id,
        address_id
      );

      if (existingAddress) {
        const customer_coordinate = {
          latitude: existingAddress.latitude,
          longitude: existingAddress.longitude,
        };
        const existingCart = await this.repository.GetCart(
          id,
          customer_coordinate
        );

        const charges = await this.shopping_repository.GetCharges();

        let total_cart_items = 0;
        let all_items_available = true;
        let available_cart_items = 0;
        for (
          let cart_index = 0;
          cart_index < existingCart.length;
          cart_index++
        ) {
          total_cart_items++;
          const cart_element = existingCart[cart_index];
          if (cart_element.isAvailable) {
            available_cart_items++;
          } else {
            all_items_available = false;
          }
        }

        const item_status = {
          total_cart_items,
          available_cart_items,
          all_items_available,
        };

        // const cart = existingCart.cart
        const cart = existingCart;
        return FormateData({ cart, charges, item_status });
      }
      throw new APIError(
        "API Error",
        STATUS_CODES.BAD_REQUEST,
        "Address Not Found"
      );
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  // async GetWishList(customerId){

  //     try {
  //         const wishListItems = await this.repository.Wishlist(customerId);
  //         return FormateData(wishListItems);
  //     } catch (err) {
  //         throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR,err)
  //     }
  // }

  // async AddToWishlist(customerId, product){
  //     try {
  //         const wishlistResult = await this.repository.AddWishlistItem(customerId, product);
  //        return FormateData(wishlistResult);

  //     } catch (err) {
  //         throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR,err)
  //     }
  // }

  async ManageCart(customerId, product, qty, action) {
    try {
      const cartResult = await this.repository.ManageCartItem(
        customerId,
        product,
        qty,
        action
      );
      return FormateData(cartResult);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      throw new APIError("API Error", error_code, err);
    }
  }

  async GetProducers(payload) {
    try {
      const orderResult = await this.repository.AddOrderToProfile(
        customerId,
        order
      );
      return FormateData(orderResult);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async RemoveProfile(_id, reason) {
    try {
      const RemoveCustomer = await this.repository.RemoveUser(_id, reason);

      return FormateData(RemoveCustomer);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async SubscribeEvents(payload) {
    const { event, data } = payload;

    const { userId, product, order, qty } = data;

    switch (event) {
      // case 'ADD_TO_WISHLIST':
      // case 'REMOVE_FROM_WISHLIST':
      //     this.AddToWishlist(userId,product)
      //     break;
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

  async UpdateUser(id, payload) {
    try {
      console.log(payload);
      const existingCustomer = await this.repository.UpdateUser(id, {
        distance: payload.distance,
      });
      return FormateData(existingCustomer);
    } catch (err) {
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetAllCustomers() {
    try {
      const existingCustomer = await this.repository.GetAllCustomers();
      return FormateData(existingCustomer);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async GetFaqs() {
    try {
      const data = await this.repository.GetFaqs();
      return FormateData(data);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async AddReview(payload) {
    try {
      const data = await this.repository.AddReview(payload);
      return FormateData(data);
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async GetReviews() {
    try {
      const data = await this.repository.GetReviews();
      return FormateData(data);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateOrderStatus(payload) {
    try {
      const orders = await this.repository.UpdateOrderStatus(payload);
      return FormateData(orders);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
}

module.exports = CustomerService;
