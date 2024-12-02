const express = require('express');
const { PORT,APP_ENV } = require('./config');
const { databaseConnection } = require('./database');
const expressApp = require('./express-app');
const fs = require("fs");
const StartServer = async() => {

    const app = express();
    
    await databaseConnection();
    
    await expressApp(app);
    
    if((APP_ENV == 'production' || APP_ENV == 'live' || APP_ENV == 'dev') && fs.existsSync("./cert_directory")) {

        const https = require("https")
        const sslServer =  https.createServer (
        {
            key: fs.readFileSync('./cert_directory/privkey.pem'),
            cert: fs.readFileSync('./cert_directory/fullchain.pem'),
        },
        app)

        sslServer.listen(PORT, () => {
            console.log(`listening to port ${PORT} with SSL`);
        })
        .on('error', (err) => {
            console.log(err);
            process.exit();
        });

    } else {

        app.listen(PORT, () => {
            console.log(`listening to port ${PORT}`);
        })
        .on('error', (err) => {
            console.log(err);
            process.exit();
        });
    }
}

StartServer();