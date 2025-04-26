module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your-default-secret-key',
  mongoURI: process.env.MONGO_URI || 'mongodb+srv://your-mongo-uri',
  serverPort: process.env.PORT || 5000,
  webSocketPort: process.env.WS_PORT || 3001
};
