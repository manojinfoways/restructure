const { ProductRepository } = require("../database");
const { FormateData } = require("../utils");
const { APIError,STATUS_CODES } = require('../utils/app-errors');

// All Business logic will be here
class ProductService {

    constructor(){
        this.repository = new ProductRepository();
    }

    async CreateProduct(productInputs){
        try{
            const productResult = await this.repository.CreateProduct(productInputs)
            return FormateData(productResult);
        }catch(err){
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
    }
    
    async GetProducts(){
        try{
            const products = await this.repository.Products();
    
            let categories = {};
    
            products.map(({ type }) => {
                categories[type] = type;
            });
            
            return FormateData({
                products,
                categories:  Object.keys(categories) ,
            })

        }catch(err){
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
    }


    async GetProductDescription(productId,payload){
        try {
            const product = await this.repository.FindById(productId,payload);
            return FormateData(product)
        } catch (err) {
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }
    }

    async GetProductsByCategory(category){
        try {
            const products = await this.repository.FindByCategory(category);
            return FormateData(products)
        } catch (err) {
            let error_code = err.statusCode ? err.statusCode : STATUS_CODES.INTERNAL_ERROR;
            let error_message = err.statusCode ? '' : 'Server Error';
            throw new APIError(error_message,error_code, err);
        }

    }


    async GetProductById(productId){
        try {
            return await this.repository.FindById(productId,null);
        } catch (err) {
            throw new APIError('Data Not found',STATUS_CODES.INTERNAL_ERROR, err)
        }
    }
     
}

module.exports = ProductService;