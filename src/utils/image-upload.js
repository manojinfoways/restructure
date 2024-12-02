const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3_SECRET,S3_ACCESS_KEY,S3_BUCKET,IMAGE_DIR } = require('../config');


aws.config.update({
  secretAccessKey: S3_SECRET,
  accessKeyId: S3_ACCESS_KEY,
  region: "ap-south-1",
});

const s3 = new aws.S3();
const fileFilter = (req, file, next) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    next(null, true);
  } else {
    next(new Error("Invalid file type, only JPEG and PNG is allowed!"), false);
  }
};

const upload = multer({
  fileFilter,
  storage: multerS3({
    acl: "public-read",
    s3,
    bucket: S3_BUCKET,
    contentType:multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, next) {
      if(file.mimetype === "image/png" ) {
        var img_extenstion = '.png';
      }
      else {
        var img_extenstion = '.jpg';
      }
      var dir = 'products';
      if (req.upload_dir) {
        dir = req.upload_dir;
        if(req.sub_dir && req.sub_dir[file.fieldname]) {
          dir += '/'+req.sub_dir[file.fieldname];
        }
      }
      if(IMAGE_DIR) {
        dir = IMAGE_DIR+'/'+dir;
      }
      next(null, dir+'/'+Date.now().toString()+img_extenstion);
    },
  }),
});

module.exports = upload;