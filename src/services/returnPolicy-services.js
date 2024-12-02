const { ReturnPolicyRepository } = require("../database");
const { FormateData, GenerateSignature } = require("../utils");
const {
  APIError,
  BadRequestError,
  STATUS_CODES,
} = require("../utils/app-errors");

class ReturnPolicyServices {
  constructor() {
    this.returnPolicy_repository = new ReturnPolicyRepository();
  }

  /*----------------------Return Policy ------------------------*/

  async GetAllReturnPolicy() {
    try {
      const getReturnPolicyData =
        await this.returnPolicy_repository.GetAllReturnPolicy();
      return FormateData(getReturnPolicyData);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  /*----------------------Estimated Pickup ------------------------*/

  async getAllEstimatedPickup(_producer) {
    try {
      const getReturnPolicyData =
        await this.returnPolicy_repository.GetAllEstimatedPickup(_producer);
      return FormateData(getReturnPolicyData);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateEstimatedPickupLookup(payload) {
    const newEstimatedPickup =
      await this.returnPolicy_repository.CreateEstimatedPickup(payload);
    return FormateData({ estimatedPickup: newEstimatedPickup });
  }

  async UpdateEstimatedPickupLookup(payload) {
    const UpdateEstimatedPickup =
      await this.returnPolicy_repository.UpdateEstimatedPickup(payload);
    return FormateData({ estimatedPickup: UpdateEstimatedPickup });
  }

  async DeleteEstimatedPickupLookup(_id, _producer) {
    const product = await this.returnPolicy_repository.DeleteEstimatedPickup(
      _id,
      _producer
    );
    return FormateData({ product: product });
  }

  /*---------------------- Return Reason ------------------------*/

  async GetReasoLookup(_producer, type) {
    try {
      const getReturnPolicyData =
        await this.returnPolicy_repository.GetReasoLookup(_producer, type);
      return FormateData(getReturnPolicyData);
    } catch (err) {
      throw new APIError("Data Not found", STATUS_CODES.INTERNAL_ERROR, err);
    }
  }

  async CreateReasonLookup(payload) {
    const newReasonLookup =
      await this.returnPolicy_repository.CreateReasonLookup(payload);
    return FormateData({ reson: newReasonLookup });
  }

  async UpdateReasonLookup(payload) {
    const updateResonLookup =
      await this.returnPolicy_repository.UpdateReasonLookup(payload);
    return FormateData({ reson: updateResonLookup });
  }

  async DeleteReasonLookup(_id, _producer) {
    const product = await this.returnPolicy_repository.DeleteReasonLookup(
      _id,
      _producer
    );
    return FormateData({ reason: product });
  }

  /*---------------------- Return Replace Item ------------------------*/

  async createReturnReplaceRequest(payload) {
    const newReturnRequest =
      await this.returnPolicy_repository.createReturnReplaceRequest(payload);
    return FormateData({ returnReplaceItem: newReturnRequest });
  }
}

module.exports = ReturnPolicyServices;
