const express = require('express');
const cors  = require('cors');
const { customer, producer,admin, shopping, agent } = require('./api');
const HandleErrors = require('./utils/error-handler')


module.exports = async (app) => {

    // app.use(express.json({ limit: '1mb'}));
    app.use(express.json());
    // app.use(express.urlencoded({ extended: true, limit: '1mb'}));
    app.use(express.urlencoded({ extended: true}));
    app.use(cors());
    // app.use(express.static(__dirname + '/public'))

    //api
    customer(app);
    producer(app);
    admin(app);
    // products(app);
    shopping(app);
    agent(app);

    // error handling
    app.use(HandleErrors);
    
}