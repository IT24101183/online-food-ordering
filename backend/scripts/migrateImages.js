const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Models
const Item = require('../models/Item');
const Category = require('../models/Category');
const User = require('../models/User');
const Advertisement = require('../models/Advertisement');
const Promotion = require('../models/Promotion');
const Review = require('../models/Review');

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

const uploadToCloudinary = async (localPath, folder) => {
  try {
    const absolutePath = path.resolve(__dirname, '..', localPath);
    if (!fs.existsSync(absolutePath)) {
      console.warn(`⚠️  File not found: ${absolutePath}`);
      return null;
    }
    const result = await cloudinary.uploader.upload(absolutePath, {
      folder: `food-app/${folder}`,
      transformation: [{ width: 800, crop: 'scale' }, { quality: 'auto' }]
    });
    return result.secure_url;
  } catch (err) {
    console.error(`❌ Error uploading ${localPath}:`, err.message);
    return null;
  }
};

const migrate = async () => {
  try {
    console.log('🚀 Starting Cloudinary Migration...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB');

    const collections = [
      { model: Category, field: 'image', folder: 'categories' },
      { model: Item, field: 'image', folder: 'items' },
      { model: Advertisement, field: 'imageUrl', folder: 'advertisements' },
      { model: Promotion, field: 'image', folder: 'promotions' },
      { model: User, field: 'profilePicture', folder: 'profiles' },
      { model: Review, field: 'images', folder: 'reviews', isArray: true }
    ];

    for (const col of collections) {
      console.log(`\n📂 Migrating ${col.model.modelName}...`);
      const docs = await col.model.find({});
      let count = 0;

      for (const doc of docs) {
        let updated = false;
        
        if (col.isArray) {
          const fieldVal = doc[col.field];
          if (Array.isArray(fieldVal)) {
            const newPaths = [];
            for (const p of fieldVal) {
              if (p && p.startsWith('uploads/')) {
                const url = await uploadToCloudinary(p, col.folder);
                if (url) {
                  newPaths.push(url);
                  updated = true;
                } else {
                  newPaths.push(p);
                }
              } else {
                newPaths.push(p);
              }
            }
            if (updated) doc[col.field] = newPaths;
          }
        } else {
          const p = doc[col.field];
          if (p && p.startsWith('uploads/')) {
            const url = await uploadToCloudinary(p, col.folder);
            if (url) {
              doc[col.field] = url;
              updated = true;
            }
          }
        }

        if (updated) {
          await doc.save();
          count++;
        }
      }
      console.log(`✅ Migrated ${count} documents in ${col.model.modelName}`);
    }

    console.log('\n✨ Migration Complete!');
    process.exit(0);
  } catch (err) {
    console.error('💥 Migration Failed:', err);
    process.exit(1);
  }
};

migrate();
