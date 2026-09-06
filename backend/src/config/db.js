const mongoose = require('mongoose');

let mongoServerInstance = null;

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.log('⚡ No MONGODB_URI provided. Initializing zero-config embedded MongoMemoryServer...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServerInstance = await MongoMemoryServer.create();
      mongoUri = mongoServerInstance.getUri();
      console.log(`📦 Embedded MongoDB started successfully at: ${mongoUri}`);
    }

    await mongoose.connect(mongoUri, {
      autoIndex: true,
    });

    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // If external URI failed, attempt fallback to MongoMemoryServer
    if (!mongoServerInstance) {
      try {
        console.log('🔄 Attempting fallback to zero-config embedded MongoMemoryServer...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServerInstance = await MongoMemoryServer.create();
        const fallbackUri = mongoServerInstance.getUri();
        await mongoose.connect(fallbackUri);
        console.log(`✅ Fallback embedded MongoDB connected at: ${fallbackUri}`);
        return mongoose.connection;
      } catch (fallbackErr) {
        console.error('❌ Fallback to memory server failed:', fallbackErr.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoServerInstance) {
    await mongoServerInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
