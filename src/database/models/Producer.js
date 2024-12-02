const mongoose = require('mongoose');
const {S3_URL} = require('../../config');

const Schema = mongoose.Schema;

const ProducerSchema = new Schema({
    name: String,
    desc: String,
    banner: String,
    icon: String,
    status: Boolean,
    // user:[
    //     { type: Schema.Types.ObjectId, ref: 'customer', require: true }
    // ],
},
{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
        },
        virtuals: true
    },
    toObject: {
        transform(doc, ret){
            delete ret.__v;
            // delete ret._id;
        },
        virtuals: true,
    },
    timestamps: true,
});
// Create a virtual property `domain` that's computed from `email`.
ProducerSchema.virtual('banner_url').get(function() {
    return S3_URL+'/'+this.banner;
});
ProducerSchema.virtual('icon_url').get(function() {
    return S3_URL+'/'+this.icon;
});


module.exports =  mongoose.model('producer', ProducerSchema);