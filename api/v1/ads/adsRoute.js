const express = require('express');

const router = express.Router();

const adsController = require('./adsController');
const passport = require('../utils/passport');

// Super admins access
router.get('/', passport.authenticate('jwt'), adsController.get_ads);

router.put('/', passport.authenticate('jwt'), adsController.update_ads);

// User access
router.get('/tags', passport.authenticate('jwt'), adsController.get_ads_tags);

router.get('/vouchers', passport.authenticate('jwt'), adsController.get_ads_vouchers);

router.get('/restaurants', passport.authenticate('jwt'), adsController.get_ads_restaurants);

module.exports = router;