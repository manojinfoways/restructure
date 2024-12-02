const dotEnv  = require("dotenv");

// if (process.env.NODE_ENV !== 'prod') {
//     const configFile =  `./.env.${process.env.NODE_ENV}`;
//     dotEnv.config({ path:  configFile });
// } else {
// }
dotEnv.config();

module.exports = {

    PORT: process.env.PORT,
    APP_ENV: process.env.APP_ENV,
    DB_URL: process.env.MONGODB_URI,
    APP_SECRET: process.env.APP_SECRET,
    REFRESH_SECRET: process.env.REFRESH_SECRET,
    ACCESS_TIME_OUT: process.env.ACCESS_TIME_OUT,
    REFRESH_TIME_OUT: process.env.REFRESH_TIME_OUT,
    S3_URL: process.env.S3_URL,
    S3_SECRET: process.env.S3_SECRET,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    IMAGE_DIR: process.env.IMAGE_DIR,
    ADMIN_AUTH: process.env.ADMIN_AUTH,
    APP_NAME: process.env.APP_NAME,
}