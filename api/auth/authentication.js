const jwt = require('jsonwebtoken');
const keys = require('../../keys');

module.exports = (req, res, next) => {
    try {
        console.log(req.headers.authorization);
        const token = req.headers.authorization.split(' ')[1];
        console.log(token);
        const decoded = jwt.verify(token, keys.jwt.key);
        //Authenticated
        req.userData = decoded;
        console.log("Authenticated");
        console.log(req.userData);
        next();
    } catch (ex) {
        return res.status(401).json({
            message: 'Auth Failed'
        })
    }
};