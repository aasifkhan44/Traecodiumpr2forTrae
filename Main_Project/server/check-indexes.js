// Script to check indexes on the games collection
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      const db = mongoose.connection;
      const indexes = await db.collection('games').indexes();
      console.log('Indexes on games collection:');
      console.log(JSON.stringify(indexes, null, 2));
    } catch (err) {
      console.error('Error fetching indexes:', err);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));