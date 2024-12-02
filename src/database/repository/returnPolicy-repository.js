const {
  ProducerModel,
  CustomerModel,
  SkuGalleryModel,
  ReturnPolicyModel,
  EstimatedPickupLookup,
  ReasonLookup,
  ReturnReplaceItem,
} = require("../models");
// const { v4: uuidv4 } = require('uuid');
const {
  APIError,
  BadRequestError,
  STATUS_CODES,
} = require("../../utils/app-errors");
const { GetDistance } = require("../../utils");

//Dealing with data base operations
class ReturnPolicyRepository {
  /*----------------------Return Policy ------------------------*/

  async GetAllReturnPolicy() {
    try {
      const getPolicy = await ReturnPolicyModel.find();
      return getPolicy;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  /*----------------------Estimated Pickup ------------------------*/

  async GetAllEstimatedPickup(_producer) {
    try {
      const getPolicy = await EstimatedPickupLookup.find({ _producer });
      return getPolicy;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateEstimatedPickup(payload) {
    try {
      const { title, _producer } = payload;

      const estimatedPickup = new EstimatedPickupLookup({
        title,
        _producer,
      });
      const result = await estimatedPickup.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateEstimatedPickup(payload) {
    try {
      const { _id, _producer, title } = payload;
      const _estimatedPickup = await EstimatedPickupLookup.findById(_id);
      if (_estimatedPickup && _estimatedPickup._producer.equals(_producer)) {
        _estimatedPickup.title = title;

        const result = await _estimatedPickup.save();
        return result;
      } else {
        throw new APIError(
          "",
          STATUS_CODES.INTERNAL_ERROR,
          "Estimated pickup Not found"
        );
      }
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async DeleteEstimatedPickup(_id, _producer) {
    try {
      const _estimatedPickup = await EstimatedPickupLookup.findById(_id);
      if (_estimatedPickup && _estimatedPickup._producer.equals(_producer)) {
        _estimatedPickup.deleted = true;

        const result = await _estimatedPickup.save();
        return { deleted: result.deleted };
      } else {
        throw new APIError(
          "",
          STATUS_CODES.INTERNAL_ERROR,
          "Estimated Pickup Not found"
        );
      }
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  /*----------------------Reson ------------------------*/

  async GetReasoLookup(_producer, type) {
    try {
      const getPolicy = await ReasonLookup.find({
        _producer,
        type,
        deleted: false,
      });
      return getPolicy;
    } catch (err) {
      console.log(err);
      throw new APIError("API Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateReasonLookup(payload) {
    try {
      const { title, _producer, type } = payload;

      const resonLookup = new ReasonLookup({
        title,
        type,
        _producer,
      });
      const result = await resonLookup.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async UpdateReasonLookup(payload) {
    try {
      const { _id, _producer, title, type } = payload;
      const _reasonLookup = await ReasonLookup.findById(_id);
      if (_reasonLookup && _reasonLookup._producer.equals(_producer)) {
        _reasonLookup.title = title;
        _reasonLookup.type = type;

        const result = await _reasonLookup.save();
        return result;
      } else {
        throw new APIError(
          "",
          STATUS_CODES.INTERNAL_ERROR,
          "Return reaso Not found"
        );
      }
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async DeleteReasonLookup(_id, _producer) {
    try {
      const _reasonLookup = await ReasonLookup.findById(_id);
      if (_reasonLookup && _reasonLookup._producer.equals(_producer)) {
        _reasonLookup.deleted = true;

        const result = await _reasonLookup.save();
        return { deleted: result.deleted };
      } else {
        throw new APIError("", STATUS_CODES.INTERNAL_ERROR, "Reason Not found");
      }
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  /*---------------------- Return Replace Item------------------------*/

  async createReturnReplaceRequest(payload) {
    try {
      const { _producer, type, _order, _product, _reason, text } = payload;

      const returnReplaceRequest = new ReturnReplaceItem({
        text,
        _order,
        _product,
        _reason,
        type,
        _producer,
      });
      const result = await returnReplaceRequest.save();
      return result;
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async updateReturnReplaceRequest(payload) {
    try {
      const { _id, _producer, _agent } = payload;
      const _assignAgent = await ReturnReplaceItem.findById(_id);
      if (_assignAgent && _assignAgent._producer.equals(_producer)) {
        _assignAgent._agent = _agent;

        const result = await _assignAgent.save();
        return result;
      } else {
        throw new APIError("", STATUS_CODES.INTERNAL_ERROR, "Not found");
      }
    } catch (err) {
      console.log(err);
      throw new APIError("Server Error", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }
}

module.exports = ReturnPolicyRepository;
