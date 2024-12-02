const mongoose = require('mongoose');
const {S3_URL} = require('../../config');

const Schema = mongoose.Schema;

const CustomerSchema = new Schema({
    fb_id: String,
    email: String,
    phone: String,
    first_name: String,
    last_name: String,
    gender : String,
    version : String,
    signup_type : String,
    device_id : String,
    fcm_id : String,
    device : String,
    latitude : String,
    longitude : String,
    distance : Number,
    user_type : {
        type: String,
        enum : ['consumer','producer','agent'],
        default: 'consumer'
    },
    status : Boolean,
    cart: [
        {
          product: { type: Schema.Types.ObjectId, ref: 'product', require: true},
          qty: { type: Number, require: true},
        }
    ],
    _producer : { type: Schema.Types.ObjectId, ref: 'producer' },
    address_line : String,
    zip_code : String,
    image: String,
    remove_account_reason : String
},{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
        },
        virtuals: true
    },
    timestamps: true
});

CustomerSchema.virtual('address', {
    ref: 'address',
    localField: '_id',
    foreignField: '_customer'
  });

CustomerSchema.virtual('assigned_orders', {
    ref: 'order_details',
    localField: '_id',
    foreignField: '_delivery_agent'
  });

CustomerSchema.virtual('image_url').get(function() {
    if(this.image) {
        return S3_URL+'/'+this.image;
    }
    else {
        return '';
    }
});
  

module.exports =  mongoose.model('customer', CustomerSchema);