const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Item = require('../models/Item');
const Category = require('../models/Category');
const User = require('../models/User');
const Advertisement = require('../models/Advertisement');
const Promotion = require('../models/Promotion');
const Review = require('../models/Review');

const checkMigration = async () => {
  try {
    console.log('📊 Verification Summary: Starting...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB');

    const collections = [
      { model: Category, field: 'image' },
      { model: Item, field: 'image' },
      { model: Advertisement, field: 'imageUrl' },
      { model: Promotion, field: 'image' },
      { model: User, field: 'profilePicture' },
      { model: Review, field: 'images', isArray: true }
    ];

    console.log('\n----------------------------------------');
    console.log('| Collection      | Total | Migrated | Local |');
    console.log('----------------------------------------');

    for (const col of collections) {
      const docs = await col.model.find({});
      let totalItems = docs.length;
      let migrated = 0;
      let local = 0;

      for (const doc of docs) {
        if (col.isArray) {
          const fieldVal = doc[col.field];
          if (Array.isArray(fieldVal)) {
            fieldVal.forEach(p => {
              if (p && p.startsWith('http')) migrated++;
              else if (p && p.startsWith('uploads/')) local++;
            });
          }
        } else {
          const p = doc[col.field];
          if (p && p.startsWith('http')) migrated++;
          else if (p && p.startsWith('uploads/')) local++;
        }
      }
      
      console.log(`| ${col.model.modelName.padEnd(14)} | ${totalItems.toString().padEnd(5)} | ${migrated.toString().padEnd(8)} | ${local.toString().padEnd(5)} |`);
    }
    console.log('----------------------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error('💥 Verification Failed:', err);
    process.exit(1);
  }
};

checkMigration();
