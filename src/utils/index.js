// const bcrypt = require('bcrypt');
const jwt  = require('jsonwebtoken');

const { APP_SECRET,REFRESH_SECRET,ACCESS_TIME_OUT,REFRESH_TIME_OUT } = require('../config');

  

//Utility functions
// module.exports.GenerateSalt = async() => {
//         return await bcrypt.genSalt()    
// },

// module.exports.GeneratePassword = async (password, salt) => {
//         return await bcrypt.hash(password, salt);
// };


// module.exports.ValidatePassword = async (enteredPassword, savedPassword, salt) => {
//         return await this.GeneratePassword(enteredPassword, salt) === savedPassword;
// };
function deg2rad(deg) {
    return deg * (Math.PI/180)
}

module.exports.GenerateSignature = async (payload) => {
        return await  {
            access_token:jwt.sign(payload, APP_SECRET, { expiresIn: ACCESS_TIME_OUT} ),
            refresh_token:jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TIME_OUT} ),
        }
}, 

module.exports.ValidateSignature  = async(req,refresh=false) => {

        const signature = req.get('Authorization');
        try {
            
            if(signature){
                if(refresh) {
                    const payload = await jwt.verify(signature.split(' ')[1], REFRESH_SECRET);
                    req.user = payload;
                    return true;
                }
                else {
                    const payload = await jwt.verify(signature.split(' ')[1], APP_SECRET);
                    req.user = payload;
                    return true;
                }
            }
        } catch (error) {
            return false;
            
        }

};

module.exports.ValidateToken  = (token) => {

    const signature = token;
    try {
        if(signature){
            const payload =  jwt.verify(signature, APP_SECRET);
            return payload;
        }
    } catch (error) {
        console.log(error);
        return false;
        
    }

};

module.exports.ValidateLatLong = async (coordinate) => {

    if(coordinate.lat && coordinate.long) {
        const isLatitude = isFinite(coordinate.lat) && Math.abs(coordinate.lat) <= 90;
        const isLongitude =  isFinite(coordinate.long) && Math.abs(coordinate.long) <= 180;
        const res = (isLatitude && isLongitude) ? true : false;
        return await res;
    }
    else if(coordinate.lat) {
        const isLatitude = isFinite(coordinate.lat) && Math.abs(coordinate.lat) <= 90;
        const res = (isLatitude) ? true : false;
        return await res;
    }
    else if(coordinate.long) {
        const isLongitude = isFinite(coordinate.long) && Math.abs(coordinate.long) <= 90;
        const res = (isLongitude) ? true : false;
        return await res;
    }
    else {
        return await false;
    }
}, 
module.exports.GetDistance =  (coordinate1,coordinate2) => {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(coordinate2.lat-coordinate1.lat);  // deg2rad 
    var dLon = deg2rad(coordinate2.long-coordinate1.long); 
    var a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(coordinate1.lat)) * Math.cos(deg2rad(coordinate2.lat)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
},
module.exports.FormateData = (data,req='') => {
        if(data && req != 'remove'){
            return { data , statusCode : 200}
            
        }
        else if(req == 'remove') {
            return { data , statusCode : 200}
        }
        else{
            throw new Error('Data Not found!')
        }
    }

module.exports.MonogoLpad = function (str, len, padstr=" ") {
    var redExpr={$reduce:{
      input:{$range:[0,{$subtract:[len, {$strLenCP:str}]}]},
      initialValue:"",
      in:{$concat:["$$value",padstr]}}};
    return {$cond:{
      if:{$gte:[{$strLenCP:str},len]},
      then:str,
      else:{$concat:[ redExpr, str]}
    }};
}
