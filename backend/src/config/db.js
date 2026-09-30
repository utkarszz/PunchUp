const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch(error){
    console.error('MongoDB connection error:');
    console.error(error.message);
    console.log('Server is still running. Note: MongoDB Atlas requires current IP to be whitelisted (https://cloud.mongodb.com).');
  }
};

module.exports = connectDB;