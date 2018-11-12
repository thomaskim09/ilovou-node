const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Restaurant = require('./restaurantsModel');
const checkAuth = require('../auth/authentication');

const RestaurantController = require('./restaurantsController');
//GET /restaurants
// router.get("/", checkAuth, RestaurantController.get_all_restaurants);
router.get("/", RestaurantController.get_all_restaurants);

//GET /restataurants/details?restaurantId=123rs'
router.get('/details', checkAuth, RestaurantController.get_restaurant_details);

//POST /restaurants(admin)
router.post('/', (req, res, next) => {
    const restaurant = new Restaurant({
        _id: new mongoose.Types.ObjectId(), //primary key
        details: req.body.details,
        vouchers: req.body.vouchers
            // feedBack: req.body.feedBack,

    });
    restaurant
        .save()
        .then(result => {
            console.log(result);
            const response = {
                message: 'Restaurant successfully created',
                restaurant: result,
                request: {
                    type: 'GET',
                    url: 'http://localhost:3000/restaurants/' + result._id
                }
            }
            res.status(201).json(response);
        })
        .catch(err => console.log(err));
});

//PATCH /retaurants/restaurantId (TODO:admin)
router.patch("/:restaurantId", (req, res, next) => {
    const id = req.params.restaurantId;
    const updateOps = {};
    console.log(req.body);
    //loop to perform bulk update of json obj
    for (const ops of req.body) {
        updateOps[ops.key] = ops.value;
    }
    Restaurant.update({ _id: id }, { $set: updateOps })
        .exec()
        .then(result => {
            const response = {
                message: 'Restaurant successfully updated',
                request: {
                    type: 'GET',
                    url: 'http://localhost:3000/restaurants/' + id
                }
            }
            res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});

//DELETE /restaurants/restaurantId
router.delete("/", (req, res, next) => {
    const id = req.body.restaurantId;
    Restaurant.remove({ _id: id })
        .exec()
        .then(result => {
            const response = {
                message: 'Restaurant successfully deleted',
            }
            res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});

router.post('/feedback', (req, res, next) => {
    const restaurant = new Restaurant({
        _id: new mongoose.Types.ObjectId(), //primary key
        details: req.body.details,
        feedBack: req.body.feedBack
    });
    restaurant
        .save()
        .then(result => {
            console.log(result);
            const response = {
                message: 'Restaurant successfully created',
                restaurant: result,
                request: {
                    type: 'GET',
                    url: 'http://localhost:3000/restaurants/' + result._id
                }
            }
            res.status(201).json(response);
        })
        .catch(err => console.log(err));
});

module.exports = router;