const express = require('express');

const app = express();

const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const compression = require('compression');
const bodyParser = require('body-parser');
const expressSanitized = require('express-sanitize-escape');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const winston = require('./utils/winston');
const keys = require('../../config/keys');
const environments = require('./utils/environments');

// Gzip compression
app.use(compression());

// Cross Origin Resource Sharing
if (environments.isProd) {
  // Set up a whitelist and check against it:
  const whitelist = [
    'http://localhost',
    'http://localhost:8080',
    'http://localhost:8100',
    'https://list.vouchy.com.my',
    'http://list.vouchy.com.my',
    'https://pwa.vouchy.com.my',
    'http://pwa.vouchy.com.my',
    'https://vouchy.com.my',
    'http://vouchy.com.my',
    'https://www.vouchy.com.my',
    'http://www.vouchy.com.my',
    'http://claim.vouchy.com.my',
    'https://claim.vouchy.com.my',
  ];
  const corsOptions = {
    origin: (origin, callback) => {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error(`${origin} is not allowed by CORS`));
      }
    }
  };
  app.use(cors(corsOptions));
} else {
  app.use(cors());
}

// Prevent cross-site scripting (XSS)
app.use(helmet());

// Prevent DOS attack
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // limit each IP to 200 requests per windowMs
});
app.use(limiter); //  apply to all requests

// Initialize passport
app.use(passport.initialize());

// Mongoose Atlas DB Connection
let mongoURI;
if (environments.isProd) {
  mongoURI = `mongodb://${keys.server.mongoUser}:${keys.server.mongoPw}@${keys.server.mongoHost}:${keys.server.mongoPort}/${keys.server.mongoDatabase}?authSource=admin`;
} else {
  mongoURI = `mongodb://${keys.atlas.Mongo_ATLAS_USER}:${keys.atlas.Mongo_ATLAS_PW}${keys.atlas.Mongo_ATLAS_HONGDOU_CONN_STRING}`;
}

try {
  mongoose.connect(mongoURI, {
    useFindAndModify: false,
    useNewUrlParser: true,
    autoIndex: false
  });
  mongoose.Promise = global.Promise;
  winston.info('Mongodb connection established successfully');
} catch (ex) {
  winston.error(`Failed to connect to mongo, ${ex.message}`);
  throw ex;
}

// Console log http requests in terminal
// const morgan = require('morgan');
// app.use(morgan('combined', {
//   stream: winston.stream
// }));
// app.use(morgan('dev')); // Disable gzip compression for content-length details

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '3mb' // To be able accept bigger request size
}));

// Parse application/json
app.use(bodyParser.json({
  limit: '3mb' // To be able accept bigger request size
}));

// Sanitize and escape all req.query & req.params
app.use(expressSanitized.middleware());

// Define Route to folder paths
const restaurantsRoute = require('./restaurants/restaurantsRoute');
const searchesRoute = require('./searches/searchesRoute');
const vouchersRoute = require('./vouchers/vouchersRoute');
const usersRoute = require('./users/usersRoute');
const ticketsRoute = require('./tickets/ticketsRoute');
const adminsRoute = require('./admins/adminsRoute');
const reservationsRoute = require('./reservations/reservationsRoute');
const feedbacksRoute = require('./feedbacks/feedbacksRoute');
const tagsRoute = require('./tags/tagsRoute');
const tokenRoute = require('./tokens/tokensRoute');
const menusRoute = require('./menus/menusRoute');
const ordersRoute = require('./orders/ordersRoute');
const superAdminsRoute = require('./super-admins/super-adminsRoute');
const treatsRoute = require('./treats/treatsRoute');
const versionsRoute = require('./versions/versionsRoute');
const adsRoute = require('./ads/adsRoute');
const logsRoute = require('./logs/logsRoute');

// Routes
app.use('/users', usersRoute);
app.use('/tickets', ticketsRoute);
app.use('/admins', adminsRoute);
app.use('/restaurants', restaurantsRoute);
app.use('/searches', searchesRoute);
app.use('/vouchers', vouchersRoute);
app.use('/reservations', reservationsRoute);
app.use('/feedbacks', feedbacksRoute);
app.use('/tags', tagsRoute);
app.use('/tokens', tokenRoute);
app.use('/menus', menusRoute);
app.use('/orders', ordersRoute);
app.use('/super_admins', superAdminsRoute);
app.use('/treats', treatsRoute);
app.use('/versions', versionsRoute);
app.use('/ads', adsRoute);
app.use('/logs', logsRoute);

// Error Handling - 404-N route found
app.use('*', (req, res, next) => {
  const error = new Error('Route Not Found');
  error.status(404);
  next(error);
});

// All errors will end up in here
app.use((error, req, res, next) => {
  winston.error(`ERROR: ${error.status || 500} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(error.status || 500).json({
    error: {
      message: error.message
    }
  });
});

module.exports = app;