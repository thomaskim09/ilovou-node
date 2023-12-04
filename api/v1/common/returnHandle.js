const winston = require('../utils/winston');

module.exports.success = (text, returnValue, res) => {
  winston.info(`${text} - ${Buffer.byteLength(JSON.stringify(returnValue))}`);
  return res.status(200).json(returnValue);
};

module.exports.successOnly = (text, res) => {
  winston.info(text);
  return res.status(200).json();
};