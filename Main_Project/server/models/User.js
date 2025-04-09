const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    countryCode: {
      type: String,
      required: [true, 'Please add a country code'],
      trim: true
    },
    mobile: {
      type: String,
      required: [true, 'Please add a mobile number'],
      unique: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allow multiple null/undefined values
      validate: {
        validator: function(value) {
          // Allow empty strings, null, or undefined
          if (!value || value.trim() === '') return true;
          // If a value is present, validate the email format
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value);
        },
        message: 'Please add a valid email address'
      }
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    balance: {
      type: Number,
      default: 0
    },
    referralCode: {
      type: String,
      unique: true
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    referrals: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        level: {
          type: Number,
          default: 1
        },
        commission: {
          type: Number,
          default: 0
        }
      }
    ],
    totalCommission: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  {
    timestamps: true
  }
);

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) {
    return next();
  }

  // Generate unique referral code if not exists
  if (!this.referralCode) {
    this.referralCode = this._id.toString().slice(-8).toUpperCase();
  }

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add referral
UserSchema.methods.addReferral = async function (userId, level = 1) {
  const referral = {
    user: userId,
    level,
    commission: 0
  };
  
  this.referrals.push(referral);
  await this.save();
  return this.referrals;
};

// Update referral commission
UserSchema.methods.updateReferralCommission = async function (userId, amount) {
  const referral = this.referrals.find(ref => ref.user.toString() === userId.toString());
  
  if (referral) {
    referral.commission += amount;
    this.totalCommission += amount;
    await this.save();
  }
  
  return this.referrals;
};

// Find referrals at a specific level
UserSchema.methods.getReferralsByLevel = async function (level) {
  return this.referrals.filter(ref => ref.level === level);
};

// Get all referred users (populated with user details)
UserSchema.statics.getAllReferrals = async function (userId, maxLevel = 10) {
  const user = await this.findById(userId);
  if (!user) return null;
  
  // Level 1 referrals (direct)
  const directReferrals = await this.find({ referredBy: userId });
  let allReferrals = directReferrals.map(r => ({ user: r, level: 1 }));
  
  // Process deeper levels up to maxLevel
  for (let level = 2; level <= maxLevel; level++) {
    const previousLevelUserIds = allReferrals
      .filter(r => r.level === level - 1)
      .map(r => r.user._id);
      
    if (previousLevelUserIds.length === 0) break;
    
    // Find users who were referred by previous level users
    const nextLevelReferrals = await this.find({
      referredBy: { $in: previousLevelUserIds }
    });
    
    // Add to our results with the current level
    const nextLevelMapped = nextLevelReferrals.map(r => ({ user: r, level }));
    allReferrals = [...allReferrals, ...nextLevelMapped];
  }
  
  return allReferrals;
};

// Apply commission to all levels when a bet is placed
UserSchema.statics.applyMultiLevelCommission = async function(userId, betAmount) {
  const CommissionSetting = mongoose.model('CommissionSetting');
  
  // Find the user who placed the bet
  const user = await this.findById(userId);
  if (!user || !user.referredBy) return null; // No referrer found
  
  let currentReferrer = user.referredBy;
  let currentLevel = 1;
  let commissionsApplied = [];
  
  // Process up to 10 levels of referrals
  while (currentReferrer && currentLevel <= 10) {
    // Get commission percentage for this level
    const commissionSetting = await CommissionSetting.findOne({ 
      level: currentLevel,
      isActive: true
    });
    
    if (!commissionSetting) {
      // No commission setting for this level, move to next referrer
      const nextUser = await this.findById(currentReferrer);
      currentReferrer = nextUser ? nextUser.referredBy : null;
      currentLevel++;
      continue;
    }
    
    // Calculate commission amount
    const commissionPercentage = commissionSetting.percentage;
    const commissionAmount = (betAmount * commissionPercentage) / 100;
    
    // Update referrer's commission
    const referrer = await this.findById(currentReferrer);
    if (referrer) {
      // Add commission to their balance
      referrer.balance += commissionAmount;
      
      // Track commission in referrals array
      const existingReferral = referrer.referrals.find(
        ref => ref.user.toString() === userId.toString()
      );
      
      if (existingReferral) {
        existingReferral.commission += commissionAmount;
      } else {
        referrer.referrals.push({
          user: userId,
          level: currentLevel,
          commission: commissionAmount
        });
      }
      
      // Update total commission
      referrer.totalCommission += commissionAmount;
      await referrer.save();
      
      // Add to our results
      commissionsApplied.push({
        referrer: referrer._id,
        level: currentLevel,
        amount: commissionAmount,
        percentage: commissionPercentage
      });
      
      // Move to next level referrer
      currentReferrer = referrer.referredBy;
      currentLevel++;
    } else {
      // Referrer not found, break the chain
      break;
    }
  }
  
  return commissionsApplied;
};

module.exports = mongoose.model('User', UserSchema);
