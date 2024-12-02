const {
  CustomerModel,
  AddressModel,
  FaqModel,
  NotificationModel,
  OfferModel,
  ReviewModel,
  OrderDetailsModel,
} = require("../models");
const {
  APIError,
  BadRequestError,
  STATUS_CODES,
} = require("../../utils/app-errors");
const { GetDistance } = require("../../utils");
const Order = require("../models/Order");
const { default: mongoose } = require("mongoose");
const { senNotification } = require("../../utils/notification");
const { Console } = require("winston/lib/winston/transports");

//Dealing with data base operations
class CustomerRepository {
  async CreateCustomer({
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
  }) {
    try {
      const customer = new CustomerModel({
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
        user_type,
        status: true,
        address_line,
        zip_code,
      });
      const customerResult = await customer.save();
      return customerResult;
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateAddress(
    _id,
    {
      email,
      phone,
      first_name,
      last_name,
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
    }
  ) {
    try {
      const profile = await CustomerModel.findById(_id);

      if (profile) {
        const newAddress = new AddressModel({
          _customer: _id,
          email,
          phone,
          first_name,
          last_name,
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

        return await newAddress.save();

        // profile.address.push(newAddress);
      }

      // return await profile.save();
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Error on Create Address:" + err
      );
    }
  }

  async UpdateAddress(
    _id,
    address_id,
    {
      email,
      phone,
      first_name,
      last_name,
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
    }
  ) {
    try {
      // const profile = await CustomerModel.findById(_id);
      const user_address = await AddressModel.findById(address_id);

      if (user_address && user_address._customer == _id) {
        const userAddress = await AddressModel.findByIdAndUpdate(address_id, {
          email,
          phone,
          first_name,
          last_name,
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

        // return userAddress;
        return await AddressModel.findById(address_id);

        // profile.address.push(newAddress);
      } else {
        throw new APIError("", STATUS_CODES.BAD_REQUEST, "Address not found");
      }

      // return await profile.save();
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async RemoveAddress(_id, address_id) {
    try {
      // const profile = await CustomerModel.findById(_id);
      const user_address = await AddressModel.findById(address_id);

      if (user_address && user_address._customer == _id) {
        await AddressModel.findByIdAndRemove(address_id);

        // return userAddress;
        return await AddressModel.findById(address_id);

        // profile.address.push(newAddress);
      } else {
        throw new APIError("", STATUS_CODES.BAD_REQUEST, "Address not found");
      }

      // return await profile.save();
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async VerifyAddress(_id, address_id) {
    try {
      // const profile = await CustomerModel.findById(_id);
      const user_address = await AddressModel.findById(address_id);

      if (user_address && user_address._customer == _id) {
        return user_address;
      } else {
        return false;
      }
    } catch (err) {
      // throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR, 'Error on Updating Address:'+err)
      return false;
    }
  }

  async RemoveDefaultAddress(user_id) {
    try {
      const addressObj = await AddressModel.updateMany(
        { _customer: user_id },
        { is_default: false }
      );
      return addressObj;
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async FindCustomer({ fb_id }) {
    try {
      const existingCustomer = await CustomerModel.findOne({
        fb_id: fb_id,
        status: 1,
      });
      return existingCustomer;
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Customer"
      );
    }
  }

  async FindCustomerById({ id }, popuplate_address = true) {
    try {
      if (popuplate_address) {
        const existingCustomer = await CustomerModel.findById(id).populate(
          "address"
        );
        // .populate('wishlist')
        // .populate('orders')
        // .populate('cart.product')
        // .populate('cart.product._producer');
        return existingCustomer;
      } else {
        const existingCustomer = await CustomerModel.findById(id);
        return existingCustomer;
      }
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Customer"
      );
    }
  }

  async GetNotifications(_userId) {
    try {
      const notifications = await NotificationModel.find({
        users: { $elemMatch: { user: _userId, read: { $ne: true } } },
      }).sort({ _id: -1 });
      return notifications;
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Notifications : " + err
      );
    }
  }

  async ReadNotification(_userId, notification_id) {
    try {
      // const notifications = NotificationModel.find({'users': {$elemMatch: {user: _userId}}}).sort({_id : -1});
      const notification = await NotificationModel.findOne({
        _id: notification_id,
        users: { $elemMatch: { user: _userId, read: { $ne: true } } },
      }).sort({ _id: -1 });
      if (notification) {
        const _users = notification.users;
        let user_index = _users.find((value) => value.user.equals(_userId));
        if (user_index) {
          _users.find((value) => value.user.equals(_userId)).read = true;
        }

        notification.users = _users;
        notification.save();
      } else {
        return {};
      }
      return notification;
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Notification " + err
      );
    }
  }

  async UpdateAddressProducer(
    _id,
    {
      first_name,
      last_name,
      address,
      zip_code,
      latitude,
      longitude,
      city,
      state,
      country,
    }
  ) {
    try {
      // const profile = await CustomerModel.findById(_id);
      const user_address = await AddressModel.findOne({ _customer: _id });

      if (user_address && user_address._customer == _id) {
        const address_id = user_address._id;
        await AddressModel.findByIdAndUpdate(address_id, {
          first_name,
          last_name,
          address,
          zip_code,
          latitude,
          longitude,
          city,
          state,
          country,
        });

        // return userAddress;
        return await AddressModel.findById(address_id);

        // profile.address.push(newAddress);
      } else {
        throw new APIError("", STATUS_CODES.BAD_REQUEST, "Address not found");
      }

      // return await profile.save();
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  // async Wishlist(customerId){
  //     try{
  //         const profile = await CustomerModel.findById(customerId).populate('wishlist');

  //         return profile.wishlist;
  //     }catch(err){
  //         throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR, 'Unable to Get Wishlist ')
  //     }
  // }

  // async AddWishlistItem(customerId, product){

  //     try{
  //         const profile = await CustomerModel.findById(customerId).populate('wishlist');

  //         if(profile){

  //              let wishlist = profile.wishlist;

  //             if(wishlist.length > 0){
  //                 let isExist = false;
  //                 wishlist.map(item => {
  //                     if(item._id.toString() === product._id.toString()){
  //                        const index = wishlist.indexOf(item);
  //                        wishlist.splice(index,1);
  //                        isExist = true;
  //                     }
  //                 });

  //                 if(!isExist){
  //                     wishlist.push(product);
  //                 }

  //             }else{
  //                 wishlist.push(product);
  //             }

  //             profile.wishlist = wishlist;
  //         }

  //         const profileResult = await profile.save();

  //         return profileResult.wishlist;

  //     }catch(err){
  //         throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR, 'Unable to Add to WishList')
  //     }

  // }

  async ManageCartItem(customerId, product, qty, action = "add") {
    try {
      const profile = await CustomerModel.findById(customerId).populate(
        "cart.product"
      );

      if (profile) {
        const cartItem = {
          product,
          qty,
        };

        let cartItems = profile.cart;

        if (cartItems.length > 0) {
          let isExist = false;
          cartItems.map((item) => {
            if (item.product == null) {
              cartItems.splice(cartItems.indexOf(item), 1);
            }
            if (
              item.product &&
              item.product._id.toString() === product._id.toString()
            ) {
              if (action == "remove") {
                cartItems.splice(cartItems.indexOf(item), 1);
              } else if (action == "add") {
                //Check Current Qty with Product
                const newQty = item.qty + qty;
                if (newQty > product.qty) {
                  // throw new Error('Unable to Add Item in Cart')
                  throw new APIError(
                    "API Error",
                    STATUS_CODES.QTY_ERROR,
                    "Unable to Add Item in Cart. Product is Out of Stock"
                  );
                } else {
                  item.qty = newQty;
                }
              } else {
                //Check Qty
                if (qty > product.qty) {
                  // throw new Error('Unable to Update Item in Cart with requested Qty')
                  throw new APIError(
                    "API Error",
                    STATUS_CODES.QTY_ERROR,
                    "Unable to Update Item in Cart with requested Qty"
                  );
                } else {
                  item.qty = qty;
                }
              }
              isExist = true;
            }
          });

          if (!isExist && action != "remove") {
            cartItems.push(cartItem);
          }
        } else {
          if (action != "remove") {
            cartItems.push(cartItem);
          }
        }

        profile.cart = cartItems;

        const cartSaveResult = await profile.save();

        return cartSaveResult.cart;
      }

      throw new Error("Error Proccessign your cart");
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let msg = err.statusCode ? "" : "Server Error";
      throw new APIError(msg, error_code, err);
    }
  }

  async SwitchCartItem(fromCustomerId, toCustomerId) {
    try {
      const fromProfile = await CustomerModel.findById(fromCustomerId).populate(
        "cart.product"
      );
      const toProfile = await CustomerModel.findById(toCustomerId).populate(
        "cart"
      );

      if (fromProfile && toProfile) {
        let fromCartItems = fromProfile.cart;
        let toCartItems = toProfile.cart;

        if (fromCartItems.length > 0) {
          if (toCartItems.length > 0) {
            for (
              let from_cart_index = 0;
              from_cart_index < fromCartItems.length;
              from_cart_index++
            ) {
              const element = fromCartItems[from_cart_index];
              const _product = element.product;
              const isExist = toCartItems.findIndex(
                ({ product }) => product.toString() === _product.id.toString()
              );

              if (isExist >= 0) {
                const existItem = toCartItems[isExist];
                let updatedQty = existItem.qty + element.qty;
                if (updatedQty > element.product.qty) {
                  updatedQty = element.product.qty;
                }
                toCartItems[isExist].qty = updatedQty;
              } else {
                const cartItem = {
                  product: _product,
                  qty: element.qty,
                };
                toCartItems.push(cartItem);
              }
            }
          } else {
            toCartItems = fromCartItems;
          }

          toProfile.cart = toCartItems;
          fromProfile.cart = [];

          await toProfile.save();
          await fromProfile.save();
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  async GetCart(customerId, customer_coordinate = null) {
    try {
      const profile = await CustomerModel.findById(customerId)
        .populate("cart.product")
        .populate({
          path: "cart.product",
          populate: "_currency _producer",
        });

      if (profile) {
        let cartItems = profile.cart;
        let cart_items = [];
        const currentDate = new Date().toISOString();

        // return cart_items;

        if (cartItems.length > 0) {
          for (let index = 0; index < cartItems.length; index++) {
            const _item = cartItems[index];
            const item = _item.toObject();

            if (item.product == null) {
              cartItems.splice(cartItems.indexOf(item), 1);
            }
            if (item.product && item.product.visible && !item.product.deleted) {
              //item.product._id.toString() === product._id.toString()
              item.isAvailable = false;
              const producer_id = item.product._producer;
              if (producer_id && customer_coordinate) {
                const producer_users = await CustomerModel.find({
                  _producer: producer_id,
                });
                if (producer_users.length) {
                  for (
                    let index_user = 0;
                    index_user < producer_users.length;
                    index_user++
                  ) {
                    const { latitude, longitude } = producer_users[index_user];
                    const distance = producer_users[index_user].distance
                      ? Math.abs(producer_users[index_user].distance)
                      : 0;
                    const coordinate1 = {
                      lat: customer_coordinate.latitude,
                      long: customer_coordinate.longitude,
                    };
                    const coordinate2 = { lat: latitude, long: longitude };
                    const point_distance = GetDistance(
                      coordinate1,
                      coordinate2
                    );

                    if (point_distance <= distance) {
                      item.isAvailable = true;
                      break;
                    }
                  }
                }
              }
              const product_id = item.product._id;
              const customer_id = customerId;
              const offer_record = await OfferModel.findOne({
                status: true,
                _producer: producer_id,
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
              item.cart_item_price = item.qty * item.product.price;
              if (offer_record && offer_record.offerPercentage > 0) {
                item.product.offer_price =
                  item.product.price -
                  (item.product.price * offer_record.offerPercentage) / 100;
                item.product.offer_percentage = offer_record.offerPercentage;
                item.offer_price =
                  item.cart_item_price -
                  (item.cart_item_price * offer_record.offerPercentage) / 100;
                item.offer_percentage = offer_record.offerPercentage;
                item.offer_id = offer_record._id;
              }
              cart_items.push(item);
            }
          }

          return cart_items;
        } else {
          return cart_items;
        }

        // profile.cart = cartItems;

        // const cartSaveResult = await profile.save();
      }

      throw new Error("Error Proccessign your cart");
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
  async AddOrderToProfile(customerId, order) {
    try {
      const profile = await CustomerModel.findById(customerId);

      if (profile) {
        if (profile.orders == undefined) {
          profile.orders = [];
        }
        profile.orders.push(order);

        profile.cart = [];

        const profileResult = await profile.save();

        return profileResult;
      }

      throw new Error("Unable to add to order!");
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Create Customer"
      );
    }
  }

  async UpdateUser(customerId, user) {
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

        if (user.first_name) {
          profile.first_name = user.first_name;
        }
        if (user.last_name) {
          profile.last_name = user.last_name;
        }
        if (user.latitude) {
          profile.latitude = user.latitude;
        }
        if (user.longitude) {
          profile.longitude = user.longitude;
        }
        if (user.address_line) {
          profile.address_line = user.address_line;
        }
        if (user.zip_code) {
          profile.zip_code = user.zip_code;
        }

        if (user.image) {
          profile.image = user.image;
        }

        const profileResult = await profile.save();

        return profileResult;
      }

      throw new Error("Unable to update user!");
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to update user!"
      );
    }
  }

  async GetAllCustomers(type = null) {
    try {
      if (type) {
        const existingCustomer = await CustomerModel.find()
          .populate("address")
          .popuplate("_producer");
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
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Customer"
      );
    }
  }

  async GetFaqs() {
    try {
      return await FaqModel.find().sort({ order: 1 });
    } catch (err) {
      throw new APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Faqs"
      );
    }
  }

  async RemoveUser(customerId, reason) {
    try {
      const profile = await CustomerModel.findById(customerId);

      if (profile) {
        profile.status = 0;
        profile.remove_account_reason = reason;

        const profileResult = await profile.save();

        if (profileResult.status && profileResult.status == 1) {
          return { isRemoved: false };
        } else {
          return { isRemoved: true };
        }
      }

      throw new Error("Unable to find user!");
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async AddReview(payload) {
    try {
      const {
        app_rating,
        product_rating,
        order_rating,
        payment_rating,
        rating,
        review,
      } = payload;
      const _customer = payload.custoer_id;
      const _orderDetail = payload.order_detail_id;

      //Get product from order detail and verify order with customer
      const OrderDetails = await OrderDetailsModel.findById(
        _orderDetail
      ).populate("_order");
      if (OrderDetails && OrderDetails._order._customer.equals(_customer)) {
        //check if review already added
        const review_check = await ReviewModel.findOne({
          _customer: _customer,
          _orderDetail: _orderDetail,
        });
        if (review_check) {
          throw new APIError(
            "API Error",
            STATUS_CODES.BAD_REQUEST,
            "Review already given"
          );
        }
        const _product = OrderDetails._product;
        const review_model = new ReviewModel({
          app_rating,
          product_rating,
          order_rating,
          payment_rating,
          rating,
          review,
          _customer,
          _product,
          _orderDetail,
        });
        const reviewResult = await review_model.save();
        return reviewResult;
      } else {
        throw new APIError(
          "API Error",
          STATUS_CODES.BAD_REQUEST,
          "Invalid Order"
        );
      }
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async GetReviews(payload) {
    try {
      return await ReviewModel.find({ _product: payload.product_id }).sort({
        id: -1,
      });
    } catch (err) {
      let error_code = err.statusCode
        ? err.statusCode
        : STATUS_CODES.INTERNAL_ERROR;
      let error_message = err.statusCode ? "" : "Server Error";
      throw new APIError(error_message, error_code, err);
    }
  }

  async UpdateStatus({ _id, status, reason, _order, _orderItem }) {
    const condition = {
      _id: mongoose.Types.ObjectId(_orderItem),
      _order: mongoose.Types.ObjectId(_order),
    };
    // if(user && user.user_type == 'producer') {
    //     condition._producer = user._producer._id;
    // } else if(user && user.user_type == 'agent') {
    //     condition._delivery_agent = user._id;
    // }

    const order_item = await OrderDetailsModel.findOne(condition)
      .populate({
        path: "_order",
        populate: {
          path: "_customer",
          match: { _id: customerId },
        },
      })
      .where("_order._customer")
      .equals(customerId);

    // const order_item = await OrderDetailsModel.aggregate([
    //   {
    //     $match: condition,
    //   },
    //   {
    //     $lookup: {
    //       from: "orders",
    //       localField: "_order",
    //       foreignField: "_id",
    //       pipeline: [
    //         {
    //           $match: { $_customer: mongoose.Types.ObjectId(_id) },
    //         },
    //       ],
    //     },
    //     as: "_order",
    //   },
    // ]);

    // const order_check = await Order.findById({ _id: _order, _customer });

    if (order_item) {
      order_item.status = status;
      order_item.reject_reason = reason;
      // if(status == 'cancelled') {
      //     order_item.reject_reason = reason;
      // }

      // const newHistory = {
      //     status
      // }
      // // await newAddress.save();

      // order_item.history.push(newHistory);
      order_item.save();

      //Notifications
      const consumer = order_item._order._customer;
      const producer = order_item._producer;

      const notification_data = {
        title: "Your Order is " + status,
        body: "Your order :" + order_item._order.order_number + " is " + status,
        user_token: consumer.fcm_id,
        user_id: consumer._id.toString(),
        api_url: "shopping/orders/track/" + order_item._id.toString(),
        api_data: {},
      };

      await senNotification(notification_data);
      if (producer) {
        const producer_users = await CustomerModel.findOne({
          _producer: producer,
          status: 1,
        });

        const notification_data_producer = {
          title: "Order is " + status,
          body: "order :" + order_item._order.order_number + " is " + status,
          user_token: producer_users.fcm_id,
          user_id: producer_users._id.toString(),
          api_url: "store/order/details/" + order_item._order._id.toString(),
          api_data: {
            status: status,
            order_number: order_item._order.order_number,
          },
        };
        await senNotification(notification_data_producer);
      } else {
        throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
      }

      // if(status)
      // const agent_statuses = ['ready','shipped','delivered'];
      // if(agent && agent_statuses.includes(status)) {
      //     const notification_data_agent = {
      //         title: 'Order is '+status,
      //         body: 'order :'+order_item._order.order_number+' is '+status,
      //         user_token : agent.fcm_id,
      //         user_id : agent._id.toString(),
      //         api_url : 'agent/order/details/'+order_item._id.toString(),
      //         api_data : {}
      //     }
      //     await senNotification(notification_data_agent);
      // }

      return order_item;
    }
  }

  async UpdateOrderStatus(payload) {
    try {
      //   let order_item_ids = [];
      //   if (Array.isArray(payload.order_items_id)) {
      //     order_item_ids = payload.order_items_id;
      //   } else {
      //     order_item_ids.push(payload.order_items_id);
      //   }
      //   const status = payload.status;
      //   const reason = payload.reason;

      //   for (
      //     let order_item_index = 0;
      //     order_item_index < order_item_ids.length;
      //     order_item_index++
      //   ) {
      //     const order_item_id = order_item_ids[order_item_index];

      await this.UpdateStatus(payload);
      //   }

      // const order_update = await OrderDetailsModel.updateMany({_id: {$in: order_item_ids},status:{$ne : status},_producer:_producer_id},{status});
      //Check delivery agent assigned if status is ready or shipped
      //   if ((status == "ready" || status == "shipped") && user._producer) {
      //     const _producer_id = user._producer.id;
      //     //,{ _delivery_agent: { $exists:false } }
      //     const pending_del_assigned = await OrderDetailsModel.find({
      //       _id: { $in: order_item_ids },
      //       _delivery_agent: { $exists: false },
      //     });

      //     // if (pending_del_assigned && pending_del_assigned.length) {
      //     //   const mainOrderId = pending_del_assigned[0]._order;

      //     //   //check if delivery agent already assigned
      //     //   const check_del_assigned = await OrderDetailsModel.find({
      //     //     _order: mainOrderId,
      //     //     _delivery_agent: { $exists: true },
      //     //     status: { $in: ["ready", "shipped"] },
      //     //   }).populate("_delivery_agent");
      //     //   let _agent = null;
      //     //   if (check_del_assigned && check_del_assigned.length) {
      //     //     _agent = check_del_assigned[0]._delivery_agent;
      //     //     const del_agent_id = check_del_assigned[0]._delivery_agent._id;
      //     //     //Assign Delivery Agent to Orders
      //     //     await OrderDetailsModel.updateMany(
      //     //       {
      //     //         _id: { $in: order_item_ids },
      //     //         _producer: _producer_id,
      //     //         _delivery_agent: { $exists: false },
      //     //       },
      //     //       { _delivery_agent: del_agent_id }
      //     //     );
      //     //   } else {
      //     //     //Get delivery Agent

      //     //     const delivery_agents = await CustomerModel.find({
      //     //       user_type: "agent",
      //     //       status: 1,
      //     //     }).populate("assigned_orders");

      //     //     if (delivery_agents && delivery_agents.length) {
      //     //       const total_del_agents = delivery_agents.length;
      //     //       const random_min = 0;
      //     //       const random_max = total_del_agents - 1;

      //     //       const random_agent_index = Math.floor(
      //     //         Math.random() * (random_max - random_min) + random_min
      //     //       );
      //     //       let agent_assign_index = null;
      //     //       for (
      //     //         let agent_index = 0;
      //     //         agent_index < delivery_agents.length;
      //     //         agent_index++
      //     //       ) {
      //     //         const agent_element = delivery_agents[agent_index];
      //     //         if (
      //     //           !(
      //     //             agent_element.assigned_orders &&
      //     //             agent_element.assigned_orders.length
      //     //           )
      //     //         ) {
      //     //           agent_assign_index = agent_index;
      //     //           break;
      //     //         } else {
      //     //           const assigned_orders = agent_element.assigned_orders;
      //     //           const found = assigned_orders.find(
      //     //             (element) =>
      //     //               element.status == "ready" || element.status == "shipped"
      //     //           );
      //     //           if (!found) {
      //     //             agent_assign_index = agent_index;
      //     //             break;
      //     //           }
      //     //         }
      //     //       }
      //     //       if (agent_assign_index === null) {
      //     //         agent_assign_index = random_agent_index;
      //     //       }

      //     //       const del_agent_id = delivery_agents[agent_assign_index]._id;
      //     //       _agent = delivery_agents[agent_assign_index];
      //     //       await OrderDetailsModel.updateMany(
      //     //         {
      //     //           _id: { $in: order_item_ids },
      //     //           _producer: _producer_id,
      //     //           _delivery_agent: { $exists: false },
      //     //         },
      //     //         { _delivery_agent: del_agent_id }
      //     //       );
      //     //     }
      //     //     // return delivery_agents;
      //     //   }
      //     //   if (_agent) {
      //     //     const notification_data_agent = {
      //     //       title: "Order Received",
      //     //       body: "You received an order",
      //     //       user_token: _agent.fcm_id,
      //     //       user_id: _agent._id.toString(),
      //     //       api_url: "agent/orders",
      //     //       api_data: { status: status },
      //     //     };
      //     //     await senNotification(notification_data_agent);
      //     //   }
      //     // }
      //   }

      //   if (user.user_type == "producer") {
      //     return await OrderDetailsModel.find({
      //       _id: { $in: order_item_ids },
      //       _producer: user._producer.id,
      //     });
      //   } else if (user.user_type == "agent") {
      //     return await OrderDetailsModel.find({
      //       _id: { $in: order_item_ids },
      //       _delivery_agent: user.id,
      //     });
      //   } else if (user.user_type == "consumer") {
      return await OrderDetailsModel.find({ _id: payload?._orderItem });
      //   }

      // return order_update;
    } catch (err) {
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
}

module.exports = CustomerRepository;
