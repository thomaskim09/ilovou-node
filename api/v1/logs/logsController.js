const winston = require('../utils/winston');

module.exports.log_to_file = (req, res, next) => {
  winston.error(req.body);
};