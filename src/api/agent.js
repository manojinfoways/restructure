const { check, validationResult } = require('express-validator');
const AgentService = require('../services/agent-service');
const ShoppingService = require('../services/shopping-service');
const  IsAgent = require('./middlewares/agent-auth');
const { ValidationError } = require('../utils/app-errors');
const { ValidateLatLong,ValidateSignature } = require('../utils');
const upload = require("../utils/image-upload");


module.exports = (app) => {
    
    const service = new AgentService();
    const shopping_service = new ShoppingService();

    app.post('/agent/login', 

    check('fb_id').notEmpty(),
    check('fcm_id').notEmpty(),

     async (req,res,next) => {
        
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }
            const { fb_id, device_id, fcm_id } = req.body;
    
            const data = await service.SignIn({ fb_id, device_id, fcm_id });
    
            return res.json(data);

        } catch (err) {
            next(err)
        }

    });

    app.get('/agent/refresh-token', 

     async (req,res,next) => {

        try {
        
            const isAuthorized = await ValidateSignature(req,true);

            if(isAuthorized && req.user && req.user._id){
                const data = await service.RefreshTokens(req.user._id);
                return res.json(data);
            }
            else {
                return res.status(419).json({statusCode:419,message: 'Invalid Token'})
            }
        } catch (err) {
            next(err)
        }

    });

    app.post('/agent/orders', IsAgent,

    check('status').notEmpty().notEmpty().isIn(['ready','shipped','delivered']),

    async (req,res,next) => {
        
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }

            const _agent = req.profile;
            const payload = req.body;

            const data = await service.GetOrders(_agent,payload);
            return res.json(data);


        } catch (err) {
            next(err)
        }

    });

    app.get('/agent/order/details/:id', IsAgent,

    // check('status').notEmpty(),
    // check('order_id').notEmpty(),

    async (req,res,next) => {
        
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }
            const _agent = req.profile;
            const payload = req.body;
            payload.order_id = req.params.id;
            // console.log(payload);

            const data = await service.GetOrdersDetails(_agent,payload);
            return res.json(data);


        } catch (err) {
            next(err)
        }

    });

    app.post('/agent/order/status_update', IsAgent,

    check('status').notEmpty().isIn(['delivered']),
    check('order_items_id').isArray({ min: 1}),

    async (req,res,next) => {
        
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }
            const _agent = req.profile;
            const payload = req.body;

            const data = await service.UpdateOrderStatus(_agent,payload);
            return res.json(data);


        } catch (err) {
            next(err)
        }

    });


    
    app.get('/agent/profile', IsAgent ,async (req,res,next) => {

        try {
            const { _id } = req.user;
            const data  = await service.GetProfile({ _id });
            return res.json(data);
            
        } catch (err) {
            next(err)
        }
    });

    app.post('/agent/profile/update', IsAgent ,

    
    async (req,res,next) => {

        try {

            const imageUpload = upload.single('image');

            req.upload_dir = 'profile';

            imageUpload(req, res, async function (err) {

                try{
  
                    if (err) {
                        throw new ValidationError('Image Upload Error', err.message)
                      }
                      else {

                        await check('first_name').notEmpty().run(req);
                        await check('last_name').notEmpty().run(req);
                        await check('latitude').notEmpty().custom( value => {
                            return ValidateLatLong({lat:value}).then(lat => {
                                if(!(lat)) {
                                    return Promise.reject('Invalid Latitude');
                                }
                            });
                        }).run(req);
                        await check('longitude').notEmpty().custom(value => {
                            return ValidateLatLong({long:value}).then(long => {
                                if(!(long)) {
                                    return Promise.reject('Invalid Longitude');
                                }
                            });
                        }).run(req);
                        await check('address').notEmpty().run(req);
                        await check('zip_code').notEmpty().run(req);
                        
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            throw new ValidationError('Data Not found', errors.array())
                        }
                        // return res.json({});
                        const image = req.file ? req.file.key : null;
                        
                        const { first_name,last_name,latitude,longitude,address,zip_code } = req.body;
                        const address_line = address;

                        const { _id } = req.user;
                        const data  = await service.UpdateProfile(_id,{first_name,last_name,latitude,longitude,address_line,zip_code,image});
                        return res.json(data);
                       
                      }
                } catch (err) {
                    console.log(err);
                    next(err)
                }
    
                
            });
            
        } catch (err) {
            console.log(err);
            next(err)
        }
    });

    app.get('/agent/notifications', IsAgent ,async (req,res,next) => {

        try {
            const { _id } = req.user;
            const data  = await service.GetNotifications(_id);
            return res.json(data);
            
        } catch (err) {
            next(err)
        }
    });

    app.get('/agent/notification/:id', IsAgent ,async (req,res,next) => {

        try {
            const { _id } = req.user;
            const  notification_id  = req.params.id;
            const data  = await service.ReadNotification(_id,notification_id);
            return res.json(data);
            
        } catch (err) {
            next(err)
        }
    });

    app.delete('/agent/account', IsAgent,

    check('reason').notEmpty(),

     async (req,res,next) => {
        
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ValidationError('Data Not found', errors.array())
            }
            const {reason} = req.body;
            const user_id = req.user._id;
    
            const data = await service.RemoveProfile(user_id,reason);
    
            return res.json(data);

        } catch (err) {
            next(err)
        }

    });

    
}