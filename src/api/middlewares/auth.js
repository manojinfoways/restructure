const { ValidateSignature } = require('../../utils');
const { CustomerModel } = require('../../database/models');

module.exports = async (req,res,next) => {
    
    const isAuthorized = await ValidateSignature(req);

    if(isAuthorized && req.user && req.user._id){
        try {
            const profile = await CustomerModel.findById(req.user._id);
            if(profile.status) {
                req.profile = profile;
                return next();
            }
        } catch (error) {
            
        }
    }
    // return res.status(403).json({message: 'Not Authorized'})
    return res.status(401).json({statusCode:401,message: 'Invalid Token'})
}

