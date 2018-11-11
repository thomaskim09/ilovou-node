const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');

const keys = require('../../keys');
// const WechatStrategy = require('passport-wechat');
const mongoose = require('mongoose');
const User = require('../users/usersModel');


passport.serializeUser((user, done) => {
    //take a piece of identifying data from the user i.e. user id from db
    console.log('Serializing User');
    done(null, user.id);
})

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user)
        });
})

//Google Strategy Setup
passport.use(
    new GoogleStrategy({
        //options for Strategy
        callbackURL: '/auth/google/redirect',
        clientID: keys.oAuth.google.clientId,
        clientSecret: keys.oAuth.google.clientSecret
    }, (accessToken, refreshToken, profile, done) => {
        //passport callback function from redirect URL
        console.log('passport callback function fired');
        User.findOne({ oauth: { google_id: profile.id } })
            .exec()
            .then(currentUser => {
                if (currentUser) {
                    //User Exists in DB, perform login
                    done(null, currentUser);
                } else {
                    //New User, add into DB
                    new User({
                        _id: new mongoose.Types.ObjectId(),
                        name: profile.displayName,
                        oauth: { google_id: profile.id }

                    }).save().then(newUser => {
                        // console.log(newUser);
                        done(null, newUser);
                    })
                }
                // res.status(200).json(response);
            })
            .catch(err => {
                return done(err);
            });

    })
)

//Wechat Strategy Setup TODO://
// passport.use(new WechatStrategy({
//         // appID: {APPID},
//         // name:{默认为wechat,可以设置组件的名字}
//         // appSecret: {APPSECRET},
//         // client:{wechat|web},
//         // callbackURL: {CALLBACKURL},
//         // scope: {snsapi_userinfo|snsapi_base},
//         // state:{STATE},
//         // getToken: {getToken},
//         // saveToken: {saveToken}
//     },
//     function(accessToken, refreshToken, profile, done) {
//         return done(err, profile);
//     }
// ));