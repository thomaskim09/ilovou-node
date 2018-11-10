const keys = require('../../keys');

module.exports = (req, res, next) => {
    if (!req.user) {
        //user is not logged in
        res.status('401').json({
            message: 'User not authorised to make api call, please log in.',
            request: {
                type: 'GET',
                url: 'http://localhost:3000/auth/login/google'
            }
        })
    }
    //if logged in, proceed
    next();
};