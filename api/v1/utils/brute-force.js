const mongoose = require('mongoose');
const ExpressBrute = require('express-brute');
const MongooseStore = require('express-brute-mongoose');
const BruteForceSchema = require('express-brute-mongoose/dist/schema');

const model = mongoose.model('bruteforces', BruteForceSchema);

const store = new MongooseStore(model);

module.exports = new ExpressBrute(store);