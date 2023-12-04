const jwt = require('jsonwebtoken');
const keys = require('../../../config/keys');
const returnHan = require('../common/returnHandle');

module.exports.get_access_token = (req, res, next) => {
    const user = {
        role: keys.jwt.role
    };
    const token = jwt.sign(user, keys.jwt.key, {
        expiresIn: keys.jwt.tokenLife
    });
    const final = {
        token: `Bearer ${token}`
    };
    return returnHan.success(`New access token generated`, final, res);
};