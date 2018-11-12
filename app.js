const express = require('express');
const app = express();
const morgan = require('morgan'); //used for loging
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const passportConfig = require('./api/middleware/passport');
const keys = require('./keys');
const passport = require('passport');

// const mssql = require('mssql');


//--Add in Cookie configuration
app.use(cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: [keys.session.cookieKey]
}))

//initialize passport
app.use(passport.initialize());
app.use(passport.session());


//--Mongoose Atlas DB Connection--//
try {
    mongoose.connect('mongodb://' +
        keys.env.Mongo_ATLAS_USER + ':' +
        keys.env.Mongo_ATLAS_PW +
        keys.env.Mongo_ATLAS_HONGDOU_CONN_STRING, { useNewUrlParser: true, autoIndex: false }
    );
    mongoose.Promise = global.Promise;
} catch (ex) { console.log("Failed to connect to mongo, " + ex.message) }


//Define routes to folder paths
const authRoutes = require('./auth/auth');
const restaurantRoutes = require('./api/restaurants/restaurantsRoute');
const uploadRoutes = require('./api/routes/uploadsRoute');
const userRoutes = require('./api/users/usersRoute');
const adminRoutes = require('./api/admins/adminsRoute');
const feedbackRoutes = require('./api/feedbacks/feedbacksRoute');

//Log requests
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Setting headers to request
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, DELETE, GET");
        return res.status(200).json({});
    }
    next();
});

//Routes
app.use('/auth', authRoutes);

app.use('/users', userRoutes);
app.use('/admin', adminRoutes);

app.use('/restaurants', restaurantRoutes);
app.use('/feedback', feedbackRoutes);

app.use('/uploads', uploadRoutes);


//Error Handling - No routes Hit
app.use((req, res, next) => {
    const error = new Error('Route Not Found');
    error.status(404); //404-N route found
    next(error);
})

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
})

module.exports = app;