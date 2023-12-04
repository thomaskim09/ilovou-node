const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const keys = require('../../../config/keys');
const winton = require('../utils/winston');

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: keys.jwt.key
};

passport.use(new JwtStrategy(options, (jwtPayload, done) => {
    const expirationDate = new Date(jwtPayload.exp * 1000);
    if (expirationDate < new Date() && jwtPayload.role === keys.jwt.role) {
        winton.warn('Not authenticated - token expired');
        return done(null, false);
    }
    const user = jwtPayload;
    return done(null, user);
}));

module.exports = passport;