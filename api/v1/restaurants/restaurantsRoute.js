const express = require('express');

const router = express.Router();

const restaurantController = require('./restaurantsController');
const passport = require('../utils/passport');

// Admin access area
router.get('/', passport.authenticate('jwt'), restaurantController.get_restaurant_details);

router.post('/', passport.authenticate('jwt'), restaurantController.create_restaurant);

router.put('/', passport.authenticate('jwt'), restaurantController.update_restaurant);


// User access area
router.post('/users', passport.authenticate('jwt'), restaurantController.get_restaurant_details_user);

router.get('/name', passport.authenticate('jwt'), restaurantController.get_restaurant_name);

module.exports = router;