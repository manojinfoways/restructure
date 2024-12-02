const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const OfferSchema = new Schema({
    _producer : { type: Schema.Types.ObjectId, ref: 'producer'},
    title : {type: String, default: ""},
    offerPercentage : Number,
    startDate : Date,
    endDate : Date,
    status : Boolean,
    fromAdmin : Boolean,
    allCustomers : Boolean,
    allProducts : Boolean,
    customers : [
         { type: Schema.Types.ObjectId, ref: 'customer'},
    ],
    products : [
        
        { type: Schema.Types.ObjectId, ref: 'product'},
        
    ],
    deletedAt: Date
},{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
            delete ret.fromAdmin;
            delete ret.id;
        },
        getters: true,
    },
    timestamps: true
});

module.exports =  mongoose.model('offers', OfferSchema);