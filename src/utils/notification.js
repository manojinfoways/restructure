const {initializeApp,cert } = require("firebase-admin/app");
const { getMessaging } = require('firebase-admin/messaging');
const serviceAccount = require("../config/firebase-data.json");
const {APP_NAME} = require("../config");
const { NotificationModel } = require('../database/models');
initializeApp({
  credential: cert(serviceAccount),
})

senNotification = async (notification_data) => {
    // Add in DB
    if(notification_data.user_id) {
        const notifications_record = new NotificationModel({
            title : notification_data.title ? notification_data.title : APP_NAME,
            description : notification_data.body ? notification_data.body : 'New Notification',
            apiUrl: notification_data.api_url ? notification_data.api_url : '/',
            apiData: notification_data.api_data ? notification_data.api_data : {},
            users : [{
                user : notification_data.user_id
            }]
        });

        await notifications_record.save();
       
    }
    const registrationToken =  notification_data.user_token;
    if(registrationToken) {

        const message_notification = {
                notification: {
                    title: notification_data.title ? notification_data.title : APP_NAME,
                    body: notification_data.body ? notification_data.body : 'New Notification',
                },
                data: {
                  api_url: notification_data.api_url ? notification_data.api_url : '/',
                  api_data: notification_data.api_data ? JSON.stringify(notification_data.api_data) : '{}',
                }
            };
    
            const notification_options = {
              priority: "high",
              timeToLive: 60 * 60 * 24
            };
    
        getMessaging().sendToDevice(registrationToken, message_notification, notification_options)
          .then( response => {
                return 1;
          })
          .catch( error => {
            console.log(error);
            return 0;
          });
    }
};
module.exports.senNotification = senNotification;