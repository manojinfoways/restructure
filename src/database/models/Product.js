const mongoose = require('mongoose');
const {S3_URL} = require('../../config');

const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    name: String,
    desc: String,
    image: String,
    price: Number,
    // unit: Number,
    qty: Number,
    visible: Boolean,
    deleted: Boolean,
    _currency : { type: Schema.Types.ObjectId, ref: 'currency' } ,
    _producer : { type: Schema.Types.ObjectId, ref: 'producer' },
    _creator : { type: Schema.Types.ObjectId, ref: 'customer' },
    _returnPolicy : { type: Schema.Types.ObjectId, ref: 'return_policy' },
    _estimatedPickup : {type: Schema.Types.ObjectId, ref: 'estimated_pickup_lookup'}
}
,{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
        },
        virtuals: true,
    },
    toObject: {
        transform(doc, ret){
            delete ret.__v;
            // delete ret._id;
        },
        virtuals: true,
    },
    timestamps: true
}

);

// Create a virtual property
ProductSchema.virtual('image_url').get(function() {
    return S3_URL+'/'+this.image;
});
ProductSchema.virtual('unit').get(function() {
    return 'qty';
});


module.exports =  mongoose.model('product', ProductSchema);