const { check, validationResult } = require('express-validator');
const ShoppingService = require("../services/shopping-service");
const UserService = require('../services/customer-service');
const ProductService = require('../services/product-service');
const { APIError, BadRequestError,ValidationError } = require('../utils/app-errors');
const UserAuth = require('./middlewares/auth');

module.exports = (app) => {
    
    const service = new ShoppingService();
    const userService = new UserService();
    const productService = new ProductService();

    app.post('/shopping/order/place',UserAuth, 

    check('delivery_type').isIn(['urgent', 'planned']),
    check('delivery_date').notEmpty().isDate(),
    check('delivery_slot').isIn(['morning','evening','default']),
    check('address_id').notEmpty(),
    // check('discount').notEmpty(),
    check('transaction_id').notEmpty(),
    check('payment_mode').notEmpty(),

    async (req,res,next) => {

        const { _id } = req.user;
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }

            // return res.json(req.body);
            
            const { delivery_type,delivery_date,delivery_slot,address_id,transaction_id,payment_mode } = req.body;
            const discount = req.body.discount ? req.body.discount : 0;
            const  data  = await service.PlaceOrder(_id, {delivery_type,delivery_date,delivery_slot,address_id,transaction_id,payment_mode,discount});
            return res.json(data);
            
        } catch (err) {
            next(err)
        }

    });

    app.post('/shopping/orders',UserAuth, async (req,res,next) => {

        const { _id } = req.user;
        const payload = req.body;

        try {
            const data = await service.GetOrders(_id,payload);
            return res.json(data);
        } catch (err) {
            next(err);
        }

    });
    app.get('/shopping/orders/track/:id',UserAuth, async (req,res,next) => {

        const { _id } = req.user;
        const payload = req.params;

        try {
            const data = await service.GetOrdersTracking(_id,payload);
            return res.json(data);
        } catch (err) {
            next(err);
        }

    });
       
    
    app.post('/shopping/cart', UserAuth, 

    check('latitude').notEmpty().custom( value => {
        return ValidateLatLong({lat:value}).then(lat => {
            if(!(lat)) {
                return Promise.reject('Invalid Latitude');
            }
        });
      }),
    check('longitude').notEmpty().custom(value => {
        return ValidateLatLong({long:value}).then(long => {
            if(!(long)) {
                return Promise.reject('Invalid Longitude');
            }
        });
      }),

    async (req,res,next) => {

        const { _id } = req.profile;
        const { latitude,longitude } = req.body;
        const customer_coordinate = { latitude,longitude };
        try {
            const data = await userService.GetShopingDetails(_id,customer_coordinate);
            return res.json(data);
        } catch (err) {
            next(err);
        }
    });

    

    app.post('/shopping/cart/add',UserAuth, 

    check('product_id').notEmpty(),
    check('qty').notEmpty().isInt(),

    async (req,res,next) => {
        
        
        try {     
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }
            const { product_id, qty } = req.body;
            const product = await productService.GetProductById(product_id);
            if(product) {
                const result =  await userService.ManageCart(req.profile._id, product, qty, 'add');
                return res.json(result);
            }
            else {
                throw new BadRequestError('Product Not found', 'Product with given ID not found')
            }
    
    
            
        } catch (err) {
            next(err)
        }
    });

    app.post('/shopping/cart/update',UserAuth, 

    check('product_id').notEmpty(),
    check('qty').notEmpty().isInt(),

    async (req,res,next) => {
        
        
        try {     
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }
            const { product_id, qty } = req.body;
            const product = await productService.GetProductById(product_id);
            if(product) {
                const result =  await userService.ManageCart(req.profile._id, product, qty, 'update');
                return res.json(result);
            }
            else {
                throw new BadRequestError('Product Not found', 'Product with given ID not found')
            }
    
    
            
        } catch (err) {
            next(err)
        }
    });
    
    app.post('/shopping/cart/delete',UserAuth, 

    check('product_id').notEmpty(),

    async (req,res,next) => {
        
        
        try {     
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }
            const { product_id } = req.body;
            const product = await productService.GetProductById(product_id);
            if(product) {
                const result =  await userService.ManageCart(req.profile._id, product, 0, 'remove');
                return res.json(result);
            }
            else {
                throw new BadRequestError('Product Not found', 'Product with given ID not found')
            }
    
    
            
        } catch (err) {
            next(err)
        }
    });

    app.get('/shopping/address/check/:id', UserAuth, 

    async (req,res,next) => {

        const { _id } = req.profile;
        const  address_id  = req.params.id;
        // const customer_coordinate = { latitude,longitude };
        try {
            const data = await userService.CheckShopingDetails(_id,address_id);
            return res.json(data);
        } catch (err) {
            next(err);
        }
    });

    app.get('/shopping/invoice/:id',UserAuth, async (req,res,next) => {

        const { _id } = req.user;
        const order_id = req.params.id;

        try {
            const data = await service.GetOrdersDetails(_id,order_id);
            return res.json(data);
        } catch (err) {
            next(err);
        }

    });

    app.post('/shopping/order/review/add',UserAuth, 

    check('order_detail_id').notEmpty(),
    check('app_rating').isIn([1,2,3,4,5]),
    check('product_rating').isIn([1,2,3,4,5]),
    check('order_rating').isIn([1,2,3,4,5]),
    check('payment_rating').notEmpty(),
    check('overall_rating').isIn([1,2,3,4,5]),

    async (req,res,next) => {
        
        
        try {     
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }
            const { order_detail_id,app_rating,product_rating,order_rating,payment_rating, overall_rating ,review } = req.body;
            const rating = overall_rating;
            const { _id } = req.profile;
            const order_review = await userService.AddReview({ order_detail_id, app_rating,product_rating,order_rating,payment_rating, rating , review,custoer_id : _id });
            return res.json(order_review);
            
        } catch (err) {
            next(err)
        }
    });
}