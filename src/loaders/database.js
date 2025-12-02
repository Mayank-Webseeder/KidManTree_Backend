const mongoose = require('mongoose');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');
const colors = require("colors");

const connectDB = async () => {
  try {
    const env = process.env.NODE_ENV || 'development';
    const config = dbConfig[env];
    
    if (!config.url) {
      throw new Error('MongoDB connection string not provided');
    }

    const conn = await mongoose.connect(config.url, config.options);
    
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`.bgBlue.white.bold);
    
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error(`❌ MongoDB connection failed: ${error.message}`.bgRed);
    process.exit(1);
  }
};

module.exports = { connectDB };