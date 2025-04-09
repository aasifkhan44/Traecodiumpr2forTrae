const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const mongoURI = 'mongodb+srv://aasif:Gandpelaat143@cluster0.khlv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Direct database operations without using the User model
const createUsers = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected');

    const db = mongoose.connection;
    const usersCollection = db.collection('users');
    
    // Clear existing test users
    await usersCollection.deleteMany({ 
      mobile: { $in: ['9876543210', '9876543211', '8765432109'] }
    });
    console.log('Removed old test users');
    
    // Create admin user with pre-hashed password
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const user1Password = await bcrypt.hash('test123', salt);
    const user2Password = await bcrypt.hash('test123', salt);
    
    // Insert admin user
    const adminUser = {
      name: 'Admin User',
      countryCode: '+91',
      mobile: '9876543210',
      password: adminPassword,
      role: 'admin',
      balance: 1000,
      isVerified: true,
      isActive: true,
      referralCode: 'ADMIN123',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result1 = await usersCollection.insertOne(adminUser);
    const adminId = result1.insertedId;
    console.log('Created admin user with ID:', adminId);
    
    // Insert test user 1
    const testUser1 = {
      name: 'Test User 1',
      countryCode: '+91',
      mobile: '9876543211',
      password: user1Password,
      role: 'user',
      balance: 500,
      isVerified: true,
      isActive: true,
      referralCode: 'TEST123',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result2 = await usersCollection.insertOne(testUser1);
    const user1Id = result2.insertedId;
    console.log('Created test user 1 with ID:', user1Id);
    
    // Insert test user 2
    const testUser2 = {
      name: 'Test User 2',
      countryCode: '+44',
      mobile: '8765432109',
      password: user2Password,
      role: 'user',
      balance: 250,
      isVerified: true,
      isActive: true,
      referralCode: 'TEST456',
      referredBy: user1Id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result3 = await usersCollection.insertOne(testUser2);
    console.log('Created test user 2 with ID:', result3.insertedId);
    
    // Verify we can get the admin user with its password
    const foundAdmin = await usersCollection.findOne({ mobile: '9876543210' });
    console.log('Found admin:', foundAdmin ? 'Yes' : 'No');
    console.log('Admin password stored correctly:', foundAdmin.password ? 'Yes' : 'No');
    
    // Test password verification
    const passwordValid = await bcrypt.compare('admin123', foundAdmin.password);
    console.log('Admin password verification result:', passwordValid);
    
    console.log('Users created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
};

createUsers();
