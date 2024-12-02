const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const FaqSchema = new Schema({
    question: String,
    answer: String,
    order : Number
},{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
        }
    },
    timestamps: true
});

module.exports =  mongoose.model('faq', FaqSchema);