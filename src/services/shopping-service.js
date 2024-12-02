const { ShoppingRepository, CustomerRepository } = require("../database");
const { FormateData } = require("../utils");
const { APIError, STATUS_CODES } = require('../utils/app-errors')

// All Business logic will be here
class ShoppingService {

    constructor(){
        this.repository = new ShoppingRepository();
        this.customerRepository = new CustomerRepository();
    }
 
    async PlaceOrder(_id,payload){

        // const { _id, txnNumber } = userInput
        // Verify the txn number with payment logs
        
        try {
            // Verify user and address
            const customerAddress = await this.customerRepository.VerifyAddress(_id,payload.address_id);
            if(customerAddress) {
                const orderResult = await this.repository.CreateNewOrder(_id, payload,customerAddress);
                return FormateData(orderResult);
            }
            else {
                throw new Error("Invalid data");
            }
        } catch (err) {
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
        
    }

    async GetOrders(customerId,payload){
        try {
            const orders = await this.repository.Orders(customerId,payload);
            return FormateData(orders)
        } catch (err) {
            throw new APIError('Data Not found', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async GetOrdersTracking(customerId,payload){
        try {
            const orders = await this.repository.OrderItemDetails(customerId,payload);
            return FormateData(orders)
        } catch (err) {
            throw new APIError('Data Not found', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async GetOrdersDetails(customerId,order_id){
        try {
            const orders = await this.repository.OrderDetails(customerId,order_id);
            return FormateData(orders)
        } catch (err) {
            throw new APIError('Data Not found', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }
  
}

module.exports = ShoppingService;