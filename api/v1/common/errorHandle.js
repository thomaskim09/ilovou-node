const winston = require('../utils/winston');

module.exports.missingParams = (list, req) => {
    list.map((val) => {
        if (!val || val === 'undefined') {
            return false;
        }
        return true;
    });
    const result = list.some(val => !val);
    if (result) {
        winston.error(`ERROR: Missing parameter (url:${req ? req.method + req.originalUrl : undefined})`);
    }
    return result;
};

module.exports.commonError = (err, res) => {
    winston.error(err);
    if (res) {
        return res.status(500).json(err);
    }
};