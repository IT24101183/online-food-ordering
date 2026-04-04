const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// Helper function to create storage for specific folders
const createStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `food-app/${folderName}`,
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 800, crop: 'scale' }, { quality: 'auto' }]
    }
  });
};

// Export specialized storage instances
module.exports = {
  cloudinary,
  itemStorage: createStorage('items'),
  categoryStorage: createStorage('categories'),
  profileStorage: createStorage('profiles'),
  advertisementStorage: createStorage('advertisements'),
  promotionStorage: createStorage('promotions'),
  reviewStorage: createStorage('reviews')
};
