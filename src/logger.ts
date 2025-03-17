import winston from "winston";

// Define the log info interface
interface LogInfo {
  timestamp: string;
  level: string;
  message: string;
}

// Create a Winston logger with console transport
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.printf((info: winston.Logform.TransformableInfo) => 
      `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info: winston.Logform.TransformableInfo) => 
          `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    // Optionally add a file transport for persistent logging
    // new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Export the logger as default export
export default logger;
