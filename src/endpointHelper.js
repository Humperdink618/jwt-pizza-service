const config = require('./config.js');
const Logger = require('./logger.js');
const logger = new Logger(config);
class StatusCodeError extends Error {
  constructor(message, statusCode) {
    super(message);
    logger.unhandledErrorLogger(this);
    this.statusCode = statusCode;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  asyncHandler,
  StatusCodeError,
};
