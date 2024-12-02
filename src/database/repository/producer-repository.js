const {
  ProducerModel,
  CustomerModel,
  SkuGalleryModel,
  ReturnPolicyModel,
} = require("../models");
// const { v4: uuidv4 } = require('uuid');
const { APIError, BadRequestError } = require("../../utils/app-errors");
const { GetDistance } = require("../../utils");
const { EstimatedPickupLookup } = require("../models");

//Dealing with data base operations
class ProducerRepository {
  async FindProducerUser({ fb_id }) {
    try {
      const existingProducer = await CustomerModel.findOne({
        fb_id: fb_id,
        status: 1,
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
        "Server Error",
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
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Customer"
      );
    }
  }

  async ProducersWithDistance(payload) {
    try {
      const producers = await ProducerModel.find();
      var producer_found = [];
      const coordinate2 = { lat: payload.latitude, long: payload.longitude };
      for (let index = 0; index < producers.length; index++) {
        const producer = producers[index];
        const user_elements = await CustomerModel.find({
          _producer: producer._id,
          status: 1,
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
                desc: producer.desc,
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
      return { data: producer_found };
    } catch (err) {
      console.log(err);
      throw APIError(
        "Server Error",
        STATUS_CODES.INTERNAL_ERROR,
        "Unable to Find Producer"
      );
    }
  }

  async SkuGallery(payload) {
    // await SkuGalleryModel.find({title : { $exists:false }}).remove();
    const limit = 10;
    const q = {};
    const sort = { title: 1, _id: 1 };
    if (payload.previous_cursor) {
      const [prevTitle, prevId] = payload.previous_cursor.split("_");
      q.$or = [
        {
          title: { $lt: prevTitle },
        },
        {
          title: prevTitle,
          _id: { $lt: prevId },
        },
      ];
    } else if (payload.next_cursor) {
      const [nextTitle, nextId] = payload.next_cursor.split("_");
      q.$or = [
        {
          title: { $gt: nextTitle },
        },
        {
          title: nextTitle,
          _id: { $gt: nextId },
        },
      ];
    }

    if (payload.search) {
      q.title = { $regex: ".*" + payload.search + ".*", $options: "i" };
    }

    const data = await SkuGalleryModel.find(q).limit(limit).sort(sort);
    // if (payload.previous_cursor) data.reverse();
    let hasNext, hasPrev, lastItem, firstItem;
    if (data.length) {
      lastItem = data[data.length - 1];
      firstItem = data[0];

      q.$or = [
        {
          title: { $gt: lastItem.title },
        },
        {
          title: lastItem.title,
          _id: { $gt: lastItem._id },
        },
      ];

      const r = await SkuGalleryModel.findOne(q);
      if (r) {
        hasNext = true;
      }

      q.$or = [
        {
          title: { $lt: firstItem.title },
        },
        {
          title: firstItem.title,
          _id: { $lt: firstItem._id },
        },
      ];
      hasPrev = !!(await SkuGalleryModel.findOne(q));
    }
    const response = {
      data,
    };
    if (hasNext) {
      response.next_cursor = `${lastItem.title}_${lastItem._id}`;
    }
    if (hasPrev) {
      response.previous_cursor = `${firstItem.title}_${firstItem._id}`;
    }
    return response;
  }

  async GetAllEstimatedPickup(_producer) {
    try {
      const getPolicy = await EstimatedPickupLookup.find({ _producer });
      return getPolicy;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
}

module.exports = ProducerRepository;
