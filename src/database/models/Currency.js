const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CurrencySchema = new Schema({
    name: String,
    locale: String,
},{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
        }
    },
    toObject: {
        transform(doc, ret){
            delete ret.__v;
        }
    },
    timestamps: true
});

module.exports =  mongoose.model('currency', CurrencySchema);