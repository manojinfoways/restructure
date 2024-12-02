const { CustomerModel, OrderModel,OrderDetailsModel,ChargeModel,ProductModel,CurrencyModel,OfferModel,ReviewModel } = require('../models');
// const { v4: uuidv4 } = require('uuid');
const { APIError, STATUS_CODES } = require('../../utils/app-errors')
const { GetDistance,MonogoLpad} = require('../../utils');
const mongoose = require('mongoose');
const {S3_URL} = require('../../config');
const {senNotification} = require('../../utils/notification');
const CustomerRepository = require('./customer-repository');


//Dealing with data base operations
class ShoppingRepository {

    // payment

    async Orders(user,payload,is_producer = false){
        try{
            // await OrderDetailsModel.findByIdAndUpdate('640240aa8e5878826f01f128',{status:'pending'});
            // await OrderDetailsModel.findByIdAndUpdate('64032bd023d06bf0e66b8d93',{status:'ready'});
            const limit = 10;
            const q = {};
            // let producer_json = {};
            if(is_producer) {
                q["order_items._producer"] = mongoose.Types.ObjectId(user.id);
                q["order_items.status"] = payload.status;
                if(payload.order_id) {
                    q._id = mongoose.Types.ObjectId(payload.order_id)
                }
               
            }
            else {
                 q._customer=mongoose.Types.ObjectId(user);
            }
            const sort = { _id: -1 }
            if(!(payload.order_id)) {
                if (payload.previous_cursor) {
                    q._id = {
                        $gt: mongoose.Types.ObjectId(payload.previous_cursor)
                        }
                    sort._id = 1
                } else if(payload.next_cursor) {
                    q._id = {
                        $lt: mongoose.Types.ObjectId(payload.next_cursor)
                        }
                    
                }

            }
            
            if(!(is_producer)) {

                let filter = payload.filter;
                if(filter) {
                    if(filter.time) {
              
                      if(filter.time.type == 'days' && filter.time.duration > 0 && filter.time.duration <= 60) {
                        q.createdAt = {
                            $gt: new Date((new Date().getTime() - (parseInt(filter.time.duration) * 24 * 60 * 60 * 1000)))
                        }
    
                      }
                      if(filter.time.type == 'year' && filter.time.duration > 0) {
                        q.$expr = {
                            "$eq": [{ "$year": "$createdAt" }, parseInt(filter.time.duration)]
                        }
                      }
                      if(filter.time.type == 'older' && filter.time.duration > 0) {
                        q.$expr = {
                            "$lt": [{ "$year": "$createdAt" }, parseInt(filter.time.duration)]
                        }
                      }
                    }
                    if(filter.status) {
                        q["order_items.status"] = filter.status
                    }
                }
            }
            const _projection = {}
            if(is_producer) {
                _projection._id = 1;
                _projection.order_number = {
                    $concat:['OD',{$cond : {if : "$incr_id" , then : MonogoLpad({$toString:"$incr_id"},8,"0"), else : ""}}]
                    // $function : {
                    //     body: function(incr_id) {
                    //         try {
                    //             if(incr_id) {
                    //                 const incr_id_str = incr_id.toString()
                    //                 return 'OD'+incr_id_str.padStart(8, '0');
                    //             } else {
                    //                 return 'OD';
                    //             }
                    //         } catch(error) { 
                    //             return 'OD';
                    //         }
                            
                    //     },
                    //     args: [ "$incr_id"],
                    //     lang: "js"
                    // }
                };
                _projection.delivery_type = 1;
                _projection.delivery_date = 1;
                _projection.delivery_slot = 1;
                _projection.createdAt = 1;
                _projection.status = payload.status;
                // _projection.order_items = 1;
                _projection.order_items_amount = 
                {
                    $sum : {
                        $map: {
                        input: "$order_items",
                        as: "order_item",
                        in: {
                            $multiply: [ "$$order_item.price", "$$order_item.qty" ]
                        }
                    }
                    }
                };
                _projection._currency = 1;
                _projection.producer = user.toObject();
                
                if(payload.order_id) {
                    _projection.order_items = 1;
                    _projection._customer = 1;
                    _projection.dest_address =  1;
                    // _projection.dest_address = {
                    //     $function : {
                    //         body: function(jsonString) {
                    //             try {
                    //                 return JSON.parse(jsonString);
                    //             } catch(error) { 
                    //                 return jsonString;
                    //             }
                                
                    //         },
                    //         args: [ "$dest_address"],
                    //         lang: "js"
                    //     }
                    // }
                }
                
            }
            else {
                _projection.__v = 0;
            }
            
            // console.log(_projection);

            const child_q = {}
            if(q['order_items.status']) {
                child_q.status = q['order_items.status'];
            }
            if(q['order_items._producer']) {
                child_q._producer = q['order_items._producer'];
            }

            const order_details = await OrderModel.aggregate([
                {
                    $lookup: {
                        from: "order_details",
                        localField: "_id",
                        foreignField: "_order",
                        pipeline: [
                            { $match: child_q}
                          ],
                        as: "order_items",
                    }
                    
                },

                {
                    $match : q
                   
                },
                { 
                    $project : _projection
                },
                {
                    $sort: sort
                },
                {
                    $limit: limit
                }
            ]);

            // console.log(order_details);
                
            
            await OrderModel.populate(order_details,{path: "_currency"});
            if(is_producer) {
                if(payload.order_id) {
                    await OrderModel.populate(order_details,{ 
                        path: 'order_items' ,
                        populate: "_product",
                        match: child_q
                        
                    });
                    await OrderModel.populate(order_details,{path: "_customer"});
                } else {

                    await OrderModel.populate(order_details,{ 
                        path: 'order_items_count' ,
                        // populate: "_producer",
                        match: child_q
                        
                    });
                }
            }
            else {
                await OrderModel.populate(order_details,{ 
                    path: 'order_items' ,
                    populate: "_producer _product",
                    match: child_q
                    
                });
            }
            // order_details.select('id');
            let data;
            if(is_producer) {
                 data = order_details;
                 if(payload.order_id) {
                    if(data.length) {
                        const order_id_details = data[0];
                        if(order_id_details && order_id_details.dest_address) {
                            order_id_details.dest_address = JSON.parse(order_id_details.dest_address);
                        }
                        return order_id_details;
                    }
                    else {
                        return {};
                    }
                 }
            }
            else {
                for (let order_index = 0; order_index < order_details.length; order_index++) {
                    const order_element = order_details[order_index];
                    const order_items = order_element.order_items;
                    for (let item_index = 0; item_index < order_items.length; item_index++) {
                        const item_element = order_items[item_index];
                        order_details[order_index].order_items[item_index] = order_details[order_index].order_items[item_index].toObject();

                       let show_review_form = false;
                       // Check order status and review
                       if(item_element.status == 'delivered') {
                           const review = await ReviewModel.findOne({_customer : order_element._customer._id,_product:item_element._product._id,_orderDetail:item_element._id});
                           if(!(review)) {
                               show_review_form = true;
                           }
                       
                        }
                        
                       order_details[order_index].order_items[item_index].show_review_form = show_review_form;
                       
                    }
                   
                }
                data = order_details.map(order => OrderModel.hydrate(order));
            }

            if (payload.previous_cursor) data.reverse();
            let hasNext, hasPrev, lastItem, firstItem;
            if (data.length) {
                lastItem = data[data.length - 1]._id;
                firstItem = data[0]._id;

                q._id = {
                    $lt: mongoose.Types.ObjectId(lastItem)
                }
                const data_next = await OrderModel.aggregate([
                    {
                        $lookup: {
                            from: "order_details",
                            localField: "_id",
                            foreignField: "_order",
                            as: "order_items"
                        }
                        
                    },
                    {$match : q},{$limit: 1}
                    ]);
                if (data_next && data_next.length) {
                    hasNext = true
                }
                q._id = {
                    $gt: mongoose.Types.ObjectId(firstItem)
                }
                const data_prev = await OrderModel.aggregate([
                    {
                        $lookup: {
                            from: "order_details",
                            localField: "_id",
                            foreignField: "_order",
                            as: "order_items"
                        }
                        
                    },
                    {$match : q},{$limit: 1}
                 ]);
                if (data_prev && data_prev.length) {
                    hasPrev = true
                }
                const response = {
                    orders:data
                  }
                  if (hasNext) {
                    response.next_cursor = `${lastItem}`
                  }
                  if (hasPrev) {
                    response.previous_cursor = `${firstItem}`
                  }
                  return response;
            }
            else {
                const response = {
                    orders:[]
                  }
                  return response;
            }        
        }catch(err){
            console.log(err);
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async AgentOrders(user,payload){
        try{
            
            const limit = 10;
            const q = {};
            // console.log(user);
            // return await OrderModel.find().populate('order_items');
            
            q["_delivery_agent"] = mongoose.Types.ObjectId(user.id);
            // const status_filter = ['ready','shipped','delivered'];
            // q["order_items.status"] = {$in: status_filter}

            q["status"] = payload.status;
            
            const sort = {_id: -1 }
            if(!(payload.order_id)) {
                if (payload.previous_cursor) {
                    q._id = {
                        $gt: mongoose.Types.ObjectId(payload.previous_cursor)
                        }
                    sort._id = 1
                } else if(payload.next_cursor) {
                    q._id = {
                        $lt: mongoose.Types.ObjectId(payload.next_cursor)
                        }
                    
                }

            }
            
            const _projection = {};

            


            
            // _projection._order = {"$first" : "$_id._order"},
            _projection.order_incr = {"$first" : "$_id._order.incr_id"},
            _projection.order_number = {
                // $function : {
                //     body: function(order) {
                //         try {
                //             if(order[0].incr_id) {
                //                 const incr_id_str = order[0].incr_id.toString()
                //                 return 'OD'+incr_id_str.padStart(8, '0');
                //             } else {
                //                 return 'OD';
                //             }
                //         } catch(error) { 
                //             return 'OD';
                //         }
                        
                //     },
                //     args: [ "$_id._order"],
                //     lang: "js"
                // }
                $concat:['OD',MonogoLpad({$toString:{"$first" : "$_id._order.incr_id"}},8,"0")]
            };
            // _projection._testpro = {"$first" : "$_id._producer._id"};
            _projection._producer = {
                _id : {"$first" : "$_id._producer._id"},
                name : {"$first" : "$_id._producer.name"},
                desc : {"$first" : "$_id._producer.desc"},
                icon_url : {$concat:[S3_URL,'/',{"$first" : "$_id._producer.icon"}]},
                banner_url : {$concat:[S3_URL,'/',{"$first" : "$_id._producer.banner"}]},
            };
            _projection.status = payload.status;
            _projection.createdAt = 1;
            _projection.src_address = 1;
            // _projection.src_address = {
            //     $function : {
            //         body: function(jsonString) {
            //             try {
            //                 return JSON.parse(jsonString);
            //             } catch(error) { 
            //                 return jsonString;
            //             }
                        
            //         },
            //         args: [ "$src_address"],
            //         lang: "js"
            //     }
            // };
            _projection.dest_address = {"$first" : "$_id._order.dest_address"};
            // _projection.dest_address = {
            //     $function : {
            //         body: function(order) {
            //             try {
            //                 return JSON.parse(order[0].dest_address);
            //             } catch(error) { 
            //                 return order[0].dest_address;
            //             }
                        
            //         },
            //         args: [ "$_id._order"],
            //         lang: "js"
            //     }
            // };
            _projection.delivery_type = {"$first" : "$_id._order.delivery_type"};
            _projection.delivery_date = {"$first" : "$_id._order.delivery_date"};
            _projection.delivery_slot = {"$first" : "$_id._order.delivery_slot"};
            
            _projection._id = "$order_details_id";//{"$first" : "$_id._order.delivery_slot"};
            

            const order_details = await OrderDetailsModel.aggregate([
                {
                    $lookup: {
                        from: "orders",
                        localField: "_order",
                        foreignField: "_id",
                        as: "order",
                    }
                    
                },
                {
                    $lookup: {
                        from: "producers",
                        localField: "_producer",
                        foreignField: "_id",
                        as: "producer",
                    }
                    
                },
                {
                    $match : q
                   
                },
                {
                    $sort: sort
                },
                { $group : { 
                            _id : {_order:"$order",_producer:"$producer"},
                            // first_producer:{$first:"$producer"},
                            createdAt : {$first:"$createdAt"},
                            src_address : {$first:"$src_address"},
                            order_details_id : {$first:"$_id"},
                            numberOfOrders: {$sum:1}
                        },
                } ,
                {
                    $addFields: { banner_url : "$_producer.banner",
                    icon_url : "$_producer.icon"}
                },
                // {
                //     $limit: limit
                // },
                { 
                    $project : _projection
                },
            ]);
            const return_order_details = [];
            if(order_details.length) {
                for (let index = 0; index < order_details.length; index++) {
                    const element = order_details[index];
                    if(element.src_address) {
                        element.src_address = JSON.parse(element.src_address);
                    }
                    if(element.dest_address) {
                        element.dest_address = JSON.parse(element.dest_address);
                    }
                    return_order_details.push(element);
                    // console.log(element);
                    
                }
            }

            return {data : return_order_details};
    
        }catch(err){
            console.log(err);
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }
    
 
 
    async CreateNewOrder(customerId, payload, customerAddress){

        //check transaction for payment Status
        
        
        try{
            const profile = await CustomerModel.findById(customerId).populate('cart.product');
    
            if(profile){

                const charges = await this.GetCharges();
                let conv_fees = 0;
                let del_fees = 0;
                for (let charge_index = 0; charge_index < charges.length; charge_index++) {
                    const charge_element = charges[charge_index];
                    if(charge_element.code == 'conv_fees') {
                        conv_fees = charge_element.value;
                    } else if(charge_element.code == 'urgent_del_fees' && payload.delivery_type == 'urgent') {
                        del_fees = charge_element.value;
                    }
                }
                
                let sub_total = 0;   

                const customer_repository = new CustomerRepository();
    
                // let cartItems = profile.cart;
                let cartItems = await customer_repository.GetCart(customerId,null);

                // return({cartItems,mainCart:profile.cart});
    
                if(cartItems.length > 0){
                    //process Order
                    cartItems.map(item => {
                        if(item.offer_price) {
                            sub_total += parseFloat(item.offer_price);
                        } else {
                            sub_total += parseFloat(item.cart_item_price);   
                        }
                    });
        
                    // const orderId = uuidv4();
                        // await OrderModel.remove();
                        // await OrderDetailsModel.remove();

                    const currencyObj = await CurrencyModel.findOne().sort({ _id: 1 });
                    const _currency = currencyObj._id;
                    const order = new OrderModel({
                        // order_id:orderId,
                        _customer: customerId,
                        delivery_type : payload.delivery_type,
                        delivery_date : payload.delivery_date,
                        delivery_slot : payload.delivery_slot,
                        sub_total,
                        delivery_charge : del_fees,
                        conveyance_charge : conv_fees,
                        discount : payload.discount,
                        // status: 'pending',
                        dest_address : customerAddress,
                        transaction_id : payload.transaction_id,
                        payment_mode : payload.payment_mode,
                        _currency
                    });
        
                    
                    
                    // order.populate('items.product').execPopulate();
                    const orderResult = await order.save();
                    let producer_notifications=[];
                    // Store Order Details
                    for (let cart_index = 0; cart_index < cartItems.length; cart_index++) {
                        const item_element = cartItems[cart_index];
                        const producer_id = item_element.product._producer;
                        const producer_users = await CustomerModel.find({_producer:producer_id}).populate('address');

                        let producer_address = '';
                        let producer_user_id = null;
                        let producer_fcm_id = null;
                        if(producer_users.length){
                            for (let index_user = 0; index_user < producer_users.length; index_user++) {
                                const { latitude,longitude } = producer_users[index_user];
                                const distance = producer_users[index_user].distance ? Math.abs(producer_users[index_user].distance) : 0;
                                const coordinate1 = {lat:customerAddress.latitude,long:customerAddress.longitude}
                                const coordinate2 = { lat:latitude,long:longitude };
                                const point_distance = GetDistance(coordinate1, coordinate2);

                                if(point_distance <= distance) {
                                    // item.isAvailable = true;
                                    // console.log(producer_users.address);
                                    // console.log(all_addresses);
                                    // return {user : producer_users[index_user],address : producer_users[index_user].address,all_addresses}
                                    if(producer_users[index_user].address){
                                        producer_address = producer_users[index_user].address[0];
                                    }
                                    else {
                                        producer_address = {latitude,longitude };
                                    }
                                    producer_user_id = producer_users[index_user]._id.toString();
                                    producer_fcm_id = producer_users[index_user].fcm_id;
                                    break;
                                }
                            }
                        }

                        const order_detail = new OrderDetailsModel({
                            _order:orderResult.id,
                            _producer: producer_id,
                            _product : item_element.product.id,
                            product_name : item_element.product.name,
                            product_image : item_element.product.image,
                            price : item_element.product.price,
                            qty : parseInt(item_element.qty),
                            status : 'pending',
                            src_address : producer_address
                        });

                        if(item_element.product.offer_price) {
                            order_detail.price = item_element.product.offer_price;
                            order_detail.original_price = item_element.product.price;
                            order_detail.offer_percentage = item_element.product.offer_percentage;
                            order_detail.offer_id = item_element.offer_id;
                        }

                        let new_qty = parseInt(item_element.product.qty) - parseInt(item_element.qty);
                        if (new_qty < 0)
                        {
                            new_qty = 0;
                        }
                        
                        await ProductModel.findByIdAndUpdate(item_element.product.id,{qty:new_qty});


                        const order_history = {status : 'pending'};
                        let current_order_history = order_detail.history;
                        current_order_history.push(order_history);

                        order_detail.history = current_order_history;
                        const orderDetail = await order_detail.save();

                        if(producer_user_id && producer_fcm_id) {
                            producer_notifications.push({
                                producer_user_id,
                                producer_fcm_id,
                                order_details_id : orderDetail._id.toString(),
                            });
                        }
                        // const producer_user_ids = producer_users[index_user]._id.toString();

                        
                    }

                    //Send Notification to Customer
                    const notification_data = {
                        title: 'Order Placed',
                        body: 'Your order placed successfully. Order Number : '+orderResult.order_number,
                        user_token : profile.fcm_id,
                        user_id : profile._id,
                        api_url : 'shopping/orders',
                        api_data : {}
                    }
                    await senNotification(notification_data);

                    if(producer_notifications.length) {
                        for (let producer_user_index = 0; producer_user_index < producer_notifications.length; producer_user_index++) {
                            const producer_user_element = producer_notifications[producer_user_index];

                            const notification_data_producer = {
                                title: 'New Order',
                                body: 'You have new Order : '+orderResult.order_number,
                                user_token : producer_user_element.producer_fcm_id,
                                user_id : producer_user_element.producer_user_id,
                                api_url : 'store/order/details/'+orderResult.id.toString(),
                                api_data : {"status":"pending","order_number":orderResult.order_number}
                            }
                            await senNotification(notification_data_producer);
                        }
                    }


                   
                    // profile.orders.push(orderResult);
                    profile.cart = [];
                    await profile.save();
    
                    return orderResult;
                }
                else {
                    // throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, 'There is no item in cart');
                    throw new  APIError('Error', STATUS_CODES.BAD_REQUEST, 'There is no item in cart');
                }
            }
    
          return {}

        }catch(err){
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
        

    }

    async GetCharges(){
        try{
            
            const checkCharge = await ChargeModel.find();
            return checkCharge;
        }catch(err){
            console.log(err);
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async OrderDetails(customer_id,order_id){
        try{

            const orderData = await OrderModel.findOne({_id:order_id,_customer:customer_id}).populate('_currency').populate({
                path : 'order_items',
                populate : '_product',
                select : {product_name: 1,product_image: 1,price : 1,qty:1,status:1}
            })
            .select({
                incr_id : 1,
                sub_total : 1,
                delivery_charge : 1,
                conveyance_charge : 1,
                discount : 1,
                order_total : 1,
                createdAt : 1,
            });
            if(orderData) {
                const orderDetails = orderData.toObject();
                orderDetails.invoice_number = orderData.order_number;
                return orderDetails;
            }
            else {
                return {};
            }

        }catch(err){
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async OrderItemDetails(user,payload,is_producer = false){
        try{

            const trackingData = await OrderDetailsModel.findOne({_id:payload.id}).populate('_producer').populate({
                path : '_product',
                populate : '_currency _producer',
            }).populate({
                path : '_order',
                populate : '_currency',
            });
            if(trackingData && trackingData._order._customer && trackingData._order._customer == user) {

                const trackingData_obj = trackingData.toObject();
                trackingData_obj.show_review_form = false;
                // Check order status and review
                if(trackingData.status == 'delivered') {
                    const review = await ReviewModel.findOne({_customer : user,_product:trackingData._product,_orderDetail:trackingData._id});
                    if(!(review)) {
                        trackingData_obj.show_review_form = true;
                    }
                }
                return trackingData_obj;
            }
            else {
                return {};
            }

        }catch(err){
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async AgentOrderDetails(user,payload){
        try{

            const orderDetail = await OrderDetailsModel.findOne({_id:payload.order_id,_delivery_agent:user._id});
            if(orderDetail) {
                const _orderId = orderDetail._order;
                const _producerId = orderDetail._producer;
                const status = orderDetail.status;

                //Get OrderDetails
                // const orderDetails = await OrderDetailsModel.find({_delivery_agent:user._id,_order:_orderId,_producer:_producerId});

                const orderMain = await OrderModel.findById(_orderId).populate({ 
                    path: 'order_items' ,
                    match: {_delivery_agent:user._id,_producer:_producerId},
                    populate: "_producer _product",
                    select : {"product_name":1, "product_image":1,"src_address":1,"status":1,"qty":1},
                    
                })
                .select({
                    "_id":1, 
                    "order_number": 1,
                    "createdAt":1,
                    "delivery_type":1,
                    "delivery_date":1,
                    "delivery_slot":1,
                    "dest_address":1,
                })
                ;
                // const data = {};

                const data = orderMain.toJSON();
                if(data ){
                    data.status = status;
                    if(data.order_items.length) {
                        for (let _order_item_index = 0; _order_item_index < data.order_items.length; _order_item_index++) {
                            const element = data.order_items[_order_item_index];
                            // const _product = element._product;
                            // data.order_items[_order_item_index].product_desc = _product.desc;
                            data.src_address = element.src_address;
                            data._producer = element._producer;
                            delete  data.order_items[_order_item_index].src_address;
                            delete data.order_items[_order_item_index]._product;
                            // delete  data.order_items[_order_item_index]._producer;
                        }
                    }
                    else {
                        return {};
                    }
                }
                
                return data;

            }
            return {};
            

        }catch(err){
            throw new APIError('Server Errors', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async UpdateOrderStatus(user,payload){
        try{
            
            let order_item_ids = [];
            if(Array.isArray(payload.order_items_id)) {
                order_item_ids = payload.order_items_id;
            }
            else {
                order_item_ids.push(payload.order_items_id);
            }
            const status = payload.status;
            const reason = payload.reason;
            
            
            for (let order_item_index = 0; order_item_index < order_item_ids.length; order_item_index++) {
                const order_item_id = order_item_ids[order_item_index];
                await this.UpdateStatus(status,reason,order_item_id,user);
                
            }

            // const order_update = await OrderDetailsModel.updateMany({_id: {$in: order_item_ids},status:{$ne : status},_producer:_producer_id},{status});
            //Check delivery agent assigned if status is ready or shipped
            if((status == 'ready' || status == 'shipped') && user._producer) {
                const _producer_id = user._producer.id;
                //,{ _delivery_agent: { $exists:false } }
                const pending_del_assigned = await OrderDetailsModel.find({_id: {$in: order_item_ids},_delivery_agent: { $exists:false }});

                if(pending_del_assigned && pending_del_assigned.length) {

                    const mainOrderId = pending_del_assigned[0]._order;

                    //check if delivery agent already assigned 
                    const check_del_assigned = await OrderDetailsModel.find({_order: mainOrderId ,_delivery_agent: { $exists:true },status : {$in : ['ready','shipped']}}).populate('_delivery_agent');
                    let _agent = null;
                    if(check_del_assigned && check_del_assigned.length) {
                        _agent = check_del_assigned[0]._delivery_agent;
                        const del_agent_id = check_del_assigned[0]._delivery_agent._id;
                        //Assign Delivery Agent to Orders
                        await OrderDetailsModel.updateMany({_id: {$in: order_item_ids},_producer:_producer_id,_delivery_agent: { $exists:false }},{_delivery_agent:del_agent_id});
                    } else {
                        //Get delivery Agent

                        const delivery_agents = await CustomerModel.find({user_type:'agent',status : 1}).populate('assigned_orders');
                        
                        if(delivery_agents && delivery_agents.length) {
                            const total_del_agents = delivery_agents.length;
                            const random_min = 0;
                            const random_max = (total_del_agents -1);
    
                            const random_agent_index = Math.floor(Math.random() * (random_max - random_min) + random_min);
                            let agent_assign_index = null;
                            for (let agent_index = 0; agent_index < delivery_agents.length; agent_index++) {
                                const agent_element = delivery_agents[agent_index];
                                if(!(agent_element.assigned_orders && agent_element.assigned_orders.length)) {
                                    agent_assign_index = agent_index;
                                    break;
                                } else {
                                    const assigned_orders = agent_element.assigned_orders;
                                    const found = assigned_orders.find(element => (element.status == "ready" || element.status == "shipped"));
                                    if(!(found)) {
                                        agent_assign_index = agent_index;
                                        break;
                                    }
                                }

                            }
                            if(agent_assign_index === null) {
                                agent_assign_index = random_agent_index;
                            }

                            const del_agent_id = delivery_agents[agent_assign_index]._id;
                            _agent = delivery_agents[agent_assign_index];
                            await OrderDetailsModel.updateMany({_id: {$in: order_item_ids},_producer:_producer_id,_delivery_agent: { $exists:false }},{_delivery_agent:del_agent_id});
                        }
                        // return delivery_agents;
                    }
                    if(_agent) {

                        const notification_data_agent = {
                            title: 'Order Received',
                            body: 'You received an order',
                            user_token : _agent.fcm_id,
                            user_id : _agent._id.toString(),
                            api_url : 'agent/orders',
                            api_data : {"status":status}
                        }
                        await senNotification(notification_data_agent);
                    }

                }

            }
            
            if(user.user_type == 'producer') {
                return await OrderDetailsModel.find({_id: {$in: order_item_ids},_producer:user._producer.id});
            } else if(user.user_type == 'agent') {
                return await OrderDetailsModel.find({_id: {$in: order_item_ids},_delivery_agent:user.id});
            } else if(user.user_type == 'consumer') {
                return await OrderDetailsModel.find({_id: {$in: order_item_ids}});
            }
            
            
            // return order_update;
            

        }catch(err){
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async UpdateStatus(status,reason,order_id,user) {
        const condition = {_id:order_id,status:{$ne:status}}
        if(user && user.user_type == 'producer') {
            condition._producer = user._producer._id;
        } else if(user && user.user_type == 'agent') {
            condition._delivery_agent = user._id;
        }
        
        const order_item = await OrderDetailsModel.findOne(condition).populate('_producer _delivery_agent').populate({ path: '_order' ,populate: "_customer"});
        
        // console.log(order_item);
        if(order_item){

            order_item.status = status;
            if(status == 'cancelled') {
                order_item.reject_reason = reason;
            }
            
            const newHistory = {
                status
            }
            // await newAddress.save();

            order_item.history.push(newHistory);
            await order_item.save();

            //Notifications
            const consumer = order_item._order._customer;
            const agent = order_item._delivery_agent;
            const producer = order_item._producer;

            const notification_data = {
                title: 'Your Order is '+status,
                body: 'Your order :'+order_item._order.order_number+' is '+status,
                user_token : consumer.fcm_id,
                user_id : consumer._id.toString(),
                api_url : 'shopping/orders/track/'+order_item._id.toString(),
                api_data : {}
            }
            await senNotification(notification_data);
            if(producer) {

                const producer_users = await CustomerModel.find({_producer:producer,status : 1});
                for (let producer_index = 0; producer_index < producer_users.length; producer_index++) {
                    const producer_user = producer_users[producer_index];
    
                    const notification_data_producer = {
                        title: 'Order is '+status,
                        body: 'order :'+order_item._order.order_number+' is '+status,
                        user_token : producer_user.fcm_id,
                        user_id : producer_user._id.toString(),
                        api_url : 'store/order/details/'+order_item._order._id.toString(),
                        api_data : {"status":status,"order_number":order_item._order.order_number}
                    }
                    // console.log(notification_data_producer);
                    await senNotification(notification_data_producer);
                }
            }

            // if(status)
            const agent_statuses = ['ready','shipped','delivered'];
            if(agent && agent_statuses.includes(status)) {
                const notification_data_agent = {
                    title: 'Order is '+status,
                    body: 'order :'+order_item._order.order_number+' is '+status,
                    user_token : agent.fcm_id,
                    user_id : agent._id.toString(),
                    api_url : 'agent/order/details/'+order_item._id.toString(),
                    api_data : {}
                }
                await senNotification(notification_data_agent);
            }


            return order_item;
        }

    }

    async GetCustomers(_producer,payload){
        try{
            
            const limit = 10;
            const q = {"user_type":'consumer'};
            
            q["order_items._producer"] = mongoose.Types.ObjectId(_producer.id);
            // q["order_items.status"] = 'delivered';
            
            
            const sort = { order_sum: -1,id: -1 }
            if (payload.previous_cursor) {
                const [prevSum, prevId] = payload.previous_cursor.split('_');
                q.$or = [{
                    order_sum: { $gt: prevSum }
                }, {
                order_sum: prevSum,
                _id: { $gt: prevId }
                }];
                // q._id = {
                //     $gt: mongoose.Types.ObjectId(payload.previous_cursor)
                //     }
                sort.order_sum = 1;
                sort._id = 1;
            } else if(payload.next_cursor) {
                const [nextSum, nextId] = payload.next_cursor.split('_');
                q.$or = [{
                    order_sum: { $lt: nextSum }
                }, {
                order_sum: nextSum,
                _id: { $lt: nextId }
                }];
                
            }
            

            const _projection = {}
            
            _projection._id = 1;
            _projection.first_name = 1;
            _projection.last_name = 1;
            _projection.email = 1;
            _projection.phone = 1;
            _projection._currency = 1;
            _projection.order_sum = 
            {
                $sum : {
                    $map: {
                    input: "$order_items",
                    as: "order_item",
                    in: {
                        $multiply: [ "$$order_item.price", "$$order_item.qty" ]
                    }
                }
                }
            };

            const child_q = {}
            if(q['order_items.status']) {
                child_q.status = q['order_items.status'];
            }
            if(q['order_items._producer']) {
                child_q._producer = q['order_items._producer'];
            }

            const customer_details = await CustomerModel.aggregate([
                {
                    $lookup: {
                        from: "orders",
                        localField: "_id",
                        foreignField: "_customer",
                        as: "orders",
                    }
                },
                {
                    $lookup: {
                        from: "currencies",
                        localField: "orders._currency",
                        foreignField: "_id",
                        as: "_currency",
                    }
                },
                {
                    $lookup: {
                        from: "order_details",
                        localField: "orders._id",
                        foreignField: "_order",
                        pipeline: [
                            { $match: child_q}
                          ],
                        as: "order_items",
                    }
                },
                {
                    $match : q
                   
                },
                { 
                    $project : _projection
                },
                {
                    $sort: sort
                },
                {
                    $limit: limit
                }
            ]);


            const data = customer_details;
            return {customer_details};

        

            // if (payload.previous_cursor) data.reverse();
            // let hasNext, hasPrev, lastItem, firstItem;
            // const page__projection = {}
            // if (data.length) {
            //     lastItem = data[data.length - 1];
            //     firstItem = data[0];
                

            //     q.$or = [{
            //         order_sum: { $lt: lastItem.order_sum }
            //       }, {
            //         order_sum: lastItem.order_sum,
            //         _id: { $lt: lastItem._id }
            //       }];

            //     page__projection.order_sum = 
            //     {
            //         $sum : {
            //             $map: {
            //             input: "$order_items",
            //             as: "order_item",
            //             in: {
            //                 $multiply: [ "$$order_item.price", "$$order_item.qty" ]
            //             }
            //         }
            //         }
            //     };
            //     const data_next = await CustomerModel.aggregate([
            //         {
            //             $lookup: {
            //                 from: "orders",
            //                 localField: "_id",
            //                 foreignField: "_customer",
            //                 as: "orders",
            //             }
            //         },
            //         {
            //             $lookup: {
            //                 from: "order_details",
            //                 localField: "orders._id",
            //                 foreignField: "_order",
            //                 pipeline: [
            //                     { $match: child_q}
            //                   ],
            //                 as: "order_items",
            //             }
            //         },
            //         { 
            //             $project : page__projection
            //         },
            //         {
            //             $match : q
            //         },
            //         {
            //             $limit: 1
            //         }
            //     ]);
            //     console.log(q['$or']);
            //     console.log(data_next);
            //     if (data_next && data_next.length) {
            //         hasNext = true
            //     }

            //     q.$or = [{
            //         order_sum: { $gt: firstItem.order_sum }
            //       }, {
            //         order_sum: firstItem.order_sum,
            //         _id: { $gt: firstItem._id }
            //       }];

            //     page__projection.order_sum = 
            //     {
            //         $sum : {
            //             $map: {
            //             input: "$order_items",
            //             as: "order_item",
            //             in: {
            //                 $multiply: [ "$$order_item.price", "$$order_item.qty" ]
            //             }
            //         }
            //         }
            //     };
            //     const data_prev = await CustomerModel.aggregate([
            //         {
            //             $lookup: {
            //                 from: "orders",
            //                 localField: "_id",
            //                 foreignField: "_customer",
            //                 as: "orders",
            //             }
            //         },
            //         {
            //             $lookup: {
            //                 from: "order_details",
            //                 localField: "orders._id",
            //                 foreignField: "_order",
            //                 pipeline: [
            //                     { $match: child_q}
            //                   ],
            //                 as: "order_items",
            //             }
            //         },
            //         {
            //             $match : q
            //         },
            //         { 
            //             $project : page__projection
            //         },
            //         {
            //             $limit: 1
            //         }
            //     ]);
            //     if (data_prev && data_prev.length) {
            //         hasPrev = true
            //     }
            //     const response = {
            //         customer_details:data
            //       }
            //       if (hasNext) {
            //         response.next_cursor = `${lastItem}`
            //       }
            //       if (hasPrev) {
            //         response.previous_cursor = `${firstItem}`
            //       }
            //       return response;
            // }
            // else {
            //     const response = {
            //         customer_details:[]
            //       }
            //       return response;
            // }        
        }catch(err){
            console.log(err);
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async GetClaims(_producer,payload){
        try{
            // return await OrderDetailsModel.findByIdAndUpdate('640f7c61bb94a4d6c185854d',{settlement_status:true});
            
            const q = {};
            
            q["_producer"] = mongoose.Types.ObjectId(_producer.id);
            // q["status"] = 'delivered';
            
            
            const sort = { _id: -1 }
            
            

            const _projection = {}
            
            _projection._id = 1;
            _projection.qty = 1;
            _projection.price = 1;
            _projection.createdAt = 1;
            _projection._customer = {"first_name" : 1,"last_name": 1,"email":1,"phone":1};
            _projection._currency = {"name" : 1,"locale": 1};
            _projection.paid_status = {$cond: {
                if: { $eq: [ true, "$settlement_status" ] },
                then: true,
                else: false
             }};
            _projection.order_sum = { $multiply: [ "$price", "$qty" ] };

            _projection.order_number = {
                $concat:['OD',MonogoLpad({$toString:"$order.incr_id"},8,"0")]
                // $function : {
                //     body: function(order) {
                //         try {
                //             if(order.incr_id) {
                //                 const incr_id_str = order.incr_id.toString()
                //                 return 'OD'+incr_id_str.padStart(8, '0');
                //             } else {
                //                 return 'OD';
                //             }
                //         } catch(error) { 
                //             return 'OD';
                //         }
                        
                //     },
                //     args: [ "$order"],
                //     lang: "js"
                // }
            };


            const order_details = await OrderDetailsModel.aggregate([
                {
                    $lookup: {
                        from: "orders",
                        localField: "_order",
                        foreignField: "_id",
                        as: "order",
                    }
                },
                {
                    $lookup: {
                        from: "currencies",
                        localField: "order._currency",
                        foreignField: "_id",
                        as: "_currency",
                    }
                },
                {
                    $lookup: {
                        from: "customers",
                        localField: "order._customer",
                        foreignField: "_id",
                        as: "_customer",
                    }
                },
                {
                    $unwind: '$order',
                },
                {
                    $unwind: '$_currency',
                },
                {
                    $unwind: '$_customer',
                },
                {
                    $match : q
                   
                },
                { 
                    $project : _projection
                },
                {
                    $sort: sort
                }
            ]);

            let paid_amount  = 0;
            let pending_amount = 0;

            
            for (let order_details_index = 0; order_details_index < order_details.length; order_details_index++) {
                const order_element = order_details[order_details_index];
                if(order_element.paid_status) {
                    paid_amount += order_element.order_sum;
                } else {
                    pending_amount += order_element.order_sum;
                }
            }
            const claim_response = {
                order_details,
                paid_amount,
                pending_amount,
                total_amount : (paid_amount + pending_amount)
            }



            return claim_response;

            // console.log(order_details);
                
              
        }catch(err){
            console.log(err);
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async GetCustomersProducts(_producer){
        try{
            
            
            const q = {"user_type":'consumer'};
            
            q["order_items._producer"] = mongoose.Types.ObjectId(_producer.id);
            // q["order_items.status"] = 'delivered';
            
            
            const sort = { first_name: 1,id: -1 }
            
            

            const _projection = {}
            
            _projection._id = 1;
            _projection.first_name = 1;
            _projection.last_name = 1;
            _projection.email = 1;
            _projection.phone = 1;
            // _projection._currency = 1;
            // _projection.order_sum = 
            // {
            //     $sum : {
            //         $map: {
            //         input: "$order_items",
            //         as: "order_item",
            //         in: {
            //             $multiply: [ "$$order_item.price", "$$order_item.qty" ]
            //         }
            //     }
            //     }
            // };

            const child_q = {}
            if(q['order_items.status']) {
                child_q.status = q['order_items.status'];
            }
            if(q['order_items._producer']) {
                child_q._producer = q['order_items._producer'];
            }

            const customer_details = await CustomerModel.aggregate([
                {
                    $lookup: {
                        from: "orders",
                        localField: "_id",
                        foreignField: "_customer",
                        as: "orders",
                    }
                },
                // {
                //     $lookup: {
                //         from: "currencies",
                //         localField: "orders._currency",
                //         foreignField: "_id",
                //         as: "_currency",
                //     }
                // },
                {
                    $lookup: {
                        from: "order_details",
                        localField: "orders._id",
                        foreignField: "_order",
                        pipeline: [
                            { $match: child_q}
                          ],
                        as: "order_items",
                    }
                },
                {
                    $match : q
                   
                },
                { 
                    $project : _projection
                },
                {
                    $sort: sort
                }
                
            ]);


            // const data = customer_details;
            const q_product = {};
            q_product._producer = _producer.id;
            const sort_product = { _id: -1 }

            const product_details = await ProductModel.find(q_product).sort(sort_product).select({name:1}).lean();


            return {customer_details,product_details};

        
   
        }catch(err){
            console.log(err);
            throw new APIError('Server Error', STATUS_CODES.INTERNAL_ERROR, err)
        }
    }

    async CreateOffer(producer,payload) {
        try{
            
            const {title,offerPercentage,status,customers,products,startDate,endDate} = payload;

            const newOffer = {
                _producer : producer._id,
                title,
                offerPercentage,status,customers,products
            }
            newOffer.allCustomers = false;
            newOffer.allProducts = false;

            if(startDate) {
                newOffer.startDate = startDate;
            }
            if(endDate) {
                newOffer.endDate = endDate;
            }

            if(customers.length == 0) {
                newOffer.allCustomers = true;
            }

            if(products.length == 0) {
                newOffer.allProducts = true;
            }
            
            

            // ProductModel.deleteMany({});
            const offer = new OfferModel(newOffer);
            const result = await offer.save();
            return result;
        }catch(err){
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
    }

    async GetOffers(_producer){
        try{
            const offers = await OfferModel.find({_producer:_producer._id,deletedAt: { $exists:false }});
            return offers;
   
        }catch(err){
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
    }

    async GetOfferById(_producer,offerId){
        try{
            const offer = await OfferModel.findOne({_id:offerId,_producer:_producer._id,deletedAt: { $exists:false }}).lean();
            if(offer) {
                //Append customer list with status
                const selected_customers = offer.customers;
                const selected_products = offer.products;
                const customer_products = await this.GetCustomersProducts(_producer);
                const all_customers = customer_products.customer_details;
                const all_products = customer_products.product_details;
                if(offer.allCustomers) {
                    offer.customers = all_customers.map(customer => ({...customer, is_selected: true}));
                } else {
                    offer.customers = all_customers.map(customer => ({...customer, is_selected: false}));
                    offer.customers.forEach(customer => {customer.is_selected = selected_customers.some(el => el.equals(customer._id))});
                }
                
                if(offer.allProducts) {
                    offer.products = all_products.map(product => ({...product, is_selected: true}));
                } else {
                    offer.products = all_products.map(product => ({...product, is_selected: false}));
                    offer.products.forEach(product => {product.is_selected = selected_products.some(el => el.equals(product._id))});
                }

                
                return offer;
            } else {
                throw new APIError('API Error', STATUS_CODES.BAD_REQUEST, 'Invalid Offer')
            }
   
        }catch(err){
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
    }

    async UpdateOffer(producer,offerId,payload) {
        try{
            
            const {title,offerPercentage,status,customers,products,startDate,endDate} = payload;

            const _offer = await OfferModel.findById(offerId);

            if(_offer && _offer._producer.equals(producer._id) && !(_offer.deletedAt)) {
                _offer.offerPercentage = offerPercentage;
                _offer.title = title;
                _offer.status = status;
                _offer.customers = customers;
                _offer.products = products;
                _offer.allCustomers = false;
                _offer.allProducts = false;
                if(startDate) {
                    _offer.startDate = startDate;
                } else {
                    _offer.startDate = undefined; 
                }

                if(endDate) {
                    _offer.endDate = endDate;
                } else {
                    _offer.endDate = undefined;  
                }
    
                if(customers.length == 0) {
                    _offer.allCustomers = true;
                }
    
                if(products.length == 0) {
                    _offer.allProducts = true;
                }

                const result = await _offer.save();
                return result;
            } else {
                throw new APIError('API Error', STATUS_CODES.BAD_REQUEST, 'Invalid Offer')
            }
            
        }catch(err){
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
    }

    async RemoveOffer(_producer,offerId){
        try{
            
            
            const _offer = await OfferModel.findById(offerId);

            if(_offer && _offer._producer.equals(_producer._id) && !(_offer.deletedAt)) {
                _offer.deletedAt = Date.now();
                _offer.save();
                if(_offer.deletedAt) {
                    return {isRemoved : true}
                } else {
                    return {isRemoved : false}
                }
            }
            else {
                throw new APIError('API Error', STATUS_CODES.BAD_REQUEST, 'Invalid Offer')
            }
            
        }catch(err){
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
    }

}

module.exports = ShoppingRepository;