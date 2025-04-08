const mongoose = require('mongoose');
const DepositRequest = require('../models/DepositRequest');
require('dotenv').config();

const clearDepositRequests = async () => {
  try {
    // Connect to database directly using the connection string
    const mongoURI = 'mongodb+srv://aasif:Gandpelaat143@cluster0.khlv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected for clearing deposit requests');

    // Get count of deposit requests before deletion
    const beforeCount = await DepositRequest.countDocuments();
    console.log(`Found ${beforeCount} deposit requests before clearing`);

    // Delete all deposit requests
    const result = await DepositRequest.deleteMany({});
    
    console.log(`Successfully deleted ${result.deletedCount} deposit requests`);
    console.log('All deposit requests have been cleared from the database');
    
    // Verify deletion
    const afterCount = await DepositRequest.countDocuments();
    console.log(`Remaining deposit requests: ${afterCount}`);
    
    console.log('Operation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error(`Error clearing deposit requests:`, error);
    process.exit(1);
  }
};

// Run the script
clearDepositRequests();