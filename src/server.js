import app from "./app.js";
import  dotenv from "dotenv";
import "colors"
import { connectDB } from "./config/database.js";

const PORT = process.env.PORT || 5000;
dotenv.config();
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}` );
});

connectDB();
// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});


// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`.red);
  server.close(() => process.exit(1));
});


// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server'.yellow);
  server.close(() => {
    console.log('HTTP server closed'.yellow);
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed'.yellow);
      process.exit(0);
    });
  });
});

