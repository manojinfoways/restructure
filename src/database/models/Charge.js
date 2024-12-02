const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ChargeSchema = new Schema({
    code: String,
    name: String,
    type: String,
    value: String,
},{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
        }
    },
    timestamps: true
});

module.exports =  mongoose.model('charge', ChargeSchema);