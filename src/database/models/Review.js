const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
    _orderDetail : { type: Schema.Types.ObjectId, ref: 'order_details',required: true},
    _customer : {type: Schema.Types.ObjectId, ref: 'customer',required: true},
    _product : {type: Schema.Types.ObjectId, ref: 'product', required: true} ,
    rating : {
        type: Number,
        min: [1, 'Rating cannot be below 1.0'],
        max: [5, 'Rating cannot be above 5.0'],
        default : 1
    },
    app_rating : {
        type: Number,
        min: [1, 'Rating cannot be below 1.0'],
        max: [5, 'Rating cannot be above 5.0'],
        default : 1
    },
    product_rating : {
        type: Number,
        min: [1, 'Rating cannot be below 1.0'],
        max: [5, 'Rating cannot be above 5.0'],
        default : 1
    },
    order_rating : {
        type: Number,
        min: [1, 'Rating cannot be below 1.0'],
        max: [5, 'Rating cannot be above 5.0'],
        default : 1
    },
    payment_rating : {
        type: Number,
        min: [1, 'Rating cannot be below 1.0'],
        max: [5, 'Rating cannot be above 5.0'],
        default : 1
    },
      
    review : String
    
},{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
            delete ret.id;
        },
        getters: true,
    },
    timestamps: true
});
ReviewSchema.virtual('overall_rating').get(function() {
    return this.rating;
});
module.exports =  mongoose.model('reviews', ReviewSchema);