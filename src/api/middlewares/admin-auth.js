const { ValidateSignature } = require("../../utils");
// const { CustomerModel } = require('../../database/models');
const { ADMIN_AUTH } = require("../../config");
const { CustomerModel } = require("../../database/models");

// module.exports = async (req, res, next) => {
//   const signature = req.get("Authorization");
//   try {
//     if (signature && signature.split(" ")[1] == ADMIN_AUTH) {
//       // const payload = await jwt.verify(signature.split(' ')[1], REFRESH_SECRET);
//       // req.user = payload;
//       return next();
//     }
//   } catch (error) {
//     return res.status(403).json({ message: "Not Authorized" });
//   }

//   return res.status(403).json({ message: "Not Authorized" });

//   // const isAuthorized = await ValidateSignature(req);

//   // if(isAuthorized && req.user && req.user._id){
//   //     try {
//   //         const profile = await CustomerModel.findById(req.user._id);
//   //         if(profile.status) {
//   //             req.profile = profile;
//   //             return next();
//   //         }
//   //     } catch (error) {

//   //     }
//   // }
//   // return res.status(403).json({message: 'Not Authorized'})
// };

module.exports = async (req, res, next) => {
  const isAuthorized = await ValidateSignature(req);

  if (isAuthorized && req.user && req.user._id) {
    try {
      const profile = await CustomerModel.findById(req.user._id).populate(
        "_producer"
      );
      if (profile.user_type == "admin") {
        req.profile = profile;
        // req.producer = profile;\
        return next();
      }
    } catch (error) {}
  }
  // return res.status(403).json({message: 'Not Authorized'})
  return res.status(401).json({ statusCode: 401, message: "Invalid Token" });
};
