const { ProducerRepository,ProductRepository,ShoppingRepository,CustomerRepository } = require("../database");
const { FormateData, GenerateSignature} = require('../utils');
const { APIError,STATUS_CODES } = require('../utils/app-errors')


// All Business logic will be here
class AgentService {

    constructor(){
        this.repository = new ProducerRepository();
        this.product_repository = new ProductRepository();
        this.shopping_repository = new ShoppingRepository();
        this.user_repository = new CustomerRepository();
    }

    async SignIn(userInputs){

        const { fb_id, device_id, fcm_id } = userInputs;
        
        try {
            const existingProducer = await this.user_repository.FindCustomer({fb_id});

            if(existingProducer && existingProducer.status && existingProducer.user_type && existingProducer.user_type == 'agent'){

                await this.user_repository.UpdateUser(existingProducer._id,{device_id, fcm_id});
                const userProfile = await this.user_repository.FindCustomerById({id:existingProducer._id});

                const tokens = await GenerateSignature({ _id: userProfile._id,fcm_id:userProfile.fcm_id});

                return FormateData({user:userProfile,tokens});
            }
            else {
                throw new APIError('', STATUS_CODES.INTERNAL_ERROR,'Agent Not Found');
            }

        } catch (err) {
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            throw new APIError('Data Not found',error_code, err);
        }

       
    }
    async RefreshTokens(user_id){
        
        
        try {
            const existingCustomer = await this.user_repository.FindCustomerById({id:user_id});

            if(existingCustomer && existingCustomer.status){

                const tokens = await GenerateSignature({ _id: existingCustomer._id,fcm_id:existingCustomer.fcm_id});

                return FormateData({user:existingCustomer,tokens});
                
            }
            else {
                throw new APIError('', STATUS_CODES.UN_AUTHORISED,'User Not Found');
            }
    

        } catch (err) {
            throw new APIError('Data Not found',STATUS_CODES.INTERNAL_ERROR, err)
        }

       
    }

    
    async GetOrders(_agent,payload){
        try {
            const orders = await this.shopping_repository.AgentOrders(_agent,payload);
            return FormateData(orders)
        } catch (err) {
            throw new APIError('Data Not found', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async GetOrdersDetails(_agent,payload){
        try {
            const orders = await this.shopping_repository.AgentOrderDetails(_agent,payload);
            return FormateData(orders)
        } catch (err) {
            throw new APIError('Data Not found', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async UpdateOrderStatus(_agent,payload){
        try {
            const orders = await this.shopping_repository.UpdateOrderStatus(_agent,payload);
            return FormateData(orders)
        } catch (err) {
            throw new APIError('Data Not found', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async GetGallery(payload){
        try {
            const orders = await this.repository.SkuGallery(payload);
            return FormateData(orders)
        } catch (err) {
            throw new APIError('Data Not found', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async GetProfile(id,populate_data = null){

        try {
            const existingUser = await this.user_repository.FindCustomerById({id},false);

            return FormateData(existingUser);
            
        } catch (err) {
            throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR,err)
        }
    }


    async UpdateProfile(_id,payload){

        try {
            const UpdateUser = await this.user_repository.UpdateUser(_id,payload);
            
            return FormateData(UpdateUser);
            
            
        } catch (err) {
            throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR,err)
        }
    }

    async GetNotifications(_userId){

        try {
            const notifications = await this.user_repository.GetNotifications(_userId);
            return FormateData(notifications);
            
            
        } catch (err) {
            throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR,err)
        }
    }

    async ReadNotification(_userId,notification_id){

        try {
            const notifications = await this.user_repository.ReadNotification(_userId,notification_id);
            return FormateData(notifications);
            
            
        } catch (err) {
            throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR,err)
        }
    }

    async RemoveProfile(_id,reason){

        try {
            const RemoveCustomer = await this.user_repository.RemoveUser(_id,reason);
            
            return FormateData(RemoveCustomer);
            
            
        } catch (err) {
            throw new APIError('API Error', STATUS_CODES.INTERNAL_ERROR,err)
        }
    }

   

    async SubscribeEvents(payload){
 
        const { event, data } =  payload;

        const { userId, product, order, qty } = data;

        switch(event){
            case 'ADD_TO_WISHLIST':
            case 'REMOVE_FROM_WISHLIST':
                this.AddToWishlist(userId,product)
                break;
            case 'ADD_TO_CART':
                this.ManageCart(userId,product, qty, false);
                break;
            case 'REMOVE_FROM_CART':
                this.ManageCart(userId,product,qty, true);
                break;
            case 'CREATE_ORDER':
                this.ManageOrder(userId,order);
                break;
            default:
                break;
        }
 
    }

}

module.exports = AgentService;