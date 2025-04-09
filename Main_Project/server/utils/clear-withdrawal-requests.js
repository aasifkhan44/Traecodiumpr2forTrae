const mongoose = require('mongoose');
const WithdrawalRequest = require('../models/WithdrawalRequest');
require('dotenv').config();

const clearWithdrawalRequests = async () => {
  try {
    // Connect to database directly using the connection string
    const mongoURI = 'mongodb+srv://aasif:Gandpelaat143@cluster0.khlv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected for clearing withdrawal requests');

    // Get count of withdrawal requests before deletion
    const beforeCount = await WithdrawalRequest.countDocuments();
    console.log(`Found ${beforeCount} withdrawal requests before clearing`);

    // Delete all withdrawal requests
    const result = await WithdrawalRequest.deleteMany({});
    
    console.log(`Successfully deleted ${result.deletedCount} withdrawal requests`);
    console.log('All withdrawal requests have been cleared from the database');
    
    // Verify deletion
    const afterCount = await WithdrawalRequest.countDocuments();
    console.log(`Remaining withdrawal requests: ${afterCount}`);
    
    console.log('Operation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error(`Error clearing withdrawal requests:`, error);
    process.exit(1);
  }
};

// Run the script
clearWithdrawalRequests();