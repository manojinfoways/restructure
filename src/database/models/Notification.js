const mongoose = require('mongoose');
const {S3_URL} = require('../../config');

const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    title: String,
    description: String,
    banner: String,
    fromAdmin : Boolean,
    apiUrl : String,
    apiData : {
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
    users : [
        {
            user: { type: Schema.Types.ObjectId, ref: 'customer', require: true},
            read : Boolean
        }
    ],
    deletedAt: Date
},{
    toJSON: {
        transform(doc, ret){
            delete ret.__v;
            delete ret.fromAdmin;
            delete ret.users;
        },
        getters: true,
    },
    timestamps: true
});

NotificationSchema.virtual('banner_url').get(function() {
    if(this.banner) {
        return S3_URL+'/'+this.banner;
    } else {
        return null;
    }
});

module.exports =  mongoose.model('notification', NotificationSchema);