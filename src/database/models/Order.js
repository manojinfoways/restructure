const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    // order_id: String,
    _customer: { type: Schema.Types.ObjectId, required: true , ref: 'customer' },
    delivery_type : {
        type: String,
        enum : ['urgent','planned'],
    },
    delivery_date : Date,
    delivery_slot : {
        type: String,
        enum : ['morning','evening','default'],
        default: 'default'
    },
    sub_total : Number,
    delivery_charge : Number,
    conveyance_charge : Number,
    discount : {type:Number,default : 0},
    // status : {
    //     type: String,
    //     enum : ['pending','confirmed','ready','shipped','delivered','rejected','cancelled','return_requested','returned','refund_process','refunded'],
    //     default: 'pending'
    // },
    dest_address :{
        type: String,
        get: function(data) {
          try { 
            return JSON.parse(data);
          } catch(error) { 
            return data;
          }
        },
        set: function(data) {
          return JSON.stringify(data);
        }
    },
    transaction_id: String,
    payment_mode: String,
    _currency : { type: Schema.Types.ObjectId, ref: 'currency' }
},
{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
        },
        getters: true,
        virtuals: true,
    },
    toObject: {
        transform(doc, ret){
            delete ret.__v;
        },
        getters: true,
        virtuals: true,
    },
    timestamps: true
});

OrderSchema.virtual('order_items', {
    ref: 'order_details',
    localField: '_id',
    foreignField: '_order'
});

OrderSchema.virtual('order_items_count', {
    ref: 'order_details',
    localField: '_id',
    foreignField: '_order',
    count: true
});

OrderSchema.virtual('order_total').get(function() {
    return parseFloat(this.sub_total) + parseFloat(this.delivery_charge) + parseFloat(this.conveyance_charge) - parseFloat(this.discount);
});
OrderSchema.virtual('order_number').get(function() {
    if(this.incr_id) {
        const incr_id_str = this.incr_id.toString()
        return 'OD'+incr_id_str.padStart(8, '0');
    } else {
        return this._id;
    }
});
OrderSchema.plugin(AutoIncrement, {inc_field: 'incr_id'});
module.exports =  mongoose.model('order', OrderSchema);