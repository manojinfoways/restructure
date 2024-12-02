const mongoose = require('mongoose');
const {S3_URL} = require('../../config');

const Schema = mongoose.Schema;

const SkuGallerySchema = new Schema({
    image: String,
    title: String,
    description: String,
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
        },
        virtuals: true,
    },
    timestamps: true,
});
// Create a virtual property 
SkuGallerySchema.virtual('image_url').get(function() {
    return S3_URL+'/'+this.image;
});


module.exports =  mongoose.model('sku_gallery', SkuGallerySchema);