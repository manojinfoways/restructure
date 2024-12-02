const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const AddressSchema = new Schema({
    _customer: { type: Schema.Types.ObjectId, ref: 'customer' },
    first_name: String,
    last_name: String,
    email: String,
    phone: String,
    house_no : Number,
    address : String,
    street: String,
    zip_code: String,
    city: String,
    state: String,
    country: String,
    latitude: String,
    longitude: String,
    type : {
        type: String,
        enum : ['home','office'],
        default: 'home'
    },
    is_default : Boolean
},{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
        }
    },
    timestamps: true
}
);

module.exports =  mongoose.model('address', AddressSchema);