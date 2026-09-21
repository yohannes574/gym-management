const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Only images are accepted as payment proof.
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Payment proof must be an image (JPG, PNG, WEBP, or GIF)."
      )
    );
  }
};

// Store the uploaded file temporarily in memory.
// It will be uploaded to Cloudinary by the payment controller.
const storage = multer.memoryStorage();

// Max 5 MB — suitable for transfer screenshots.
const uploadPaymentProof = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

// Multer errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE:
        "Payment proof image is too large. Maximum size is 5 MB.",

      LIMIT_FILE_COUNT:
        "Only one payment proof image can be uploaded.",

      LIMIT_UNEXPECTED_FILE:
        'Unexpected upload field. Use "proofImage".',
    };

    return res.status(400).json({
      message:
        messages[err.code] || "Payment proof upload failed.",
    });
  }

  if (err) {
    return res.status(400).json({
      message: err.message,
    });
  }

  next();
};

module.exports = {
  uploadPaymentProof,
  handleUploadErrors,
  cloudinary,
};