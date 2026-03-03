// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Optionnel : log en console en dev
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(
//   );
// }

module.exports = logger;
