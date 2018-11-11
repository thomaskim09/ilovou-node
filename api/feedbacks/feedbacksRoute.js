const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//Auth check
const oAuthcheck = require('../middleware/oauth-check');

//Schema Dependentcies
const Feedback = require('./feedbacksModel');
const Restaurant = require('../restaurants/restaurantsModel');
const User = require('../users/usersModel');


//GET /feedback/restaurant {restaurantId}
router.get('/restaurant', oAuthcheck, (req, res, next) => {
    var res_id = req.query.restaurantId;
    if (!res_id) { res.status(500).json({ error: err }); }
    Feedback.find({ restaurant_id: res_id })
        .exec()
        .then(docs => {
            // console.log(docs.toObject())
            const response = {
                count: docs.length,
                data: docs.map(doc => {
                    return {
                        feedback: doc.feedback
                    }
                })
            }
            res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: err });
        });

});

//GET /feedback/voucher --Retrieve
router.get('/', (req, res, next) => {

});

//GET /feedback/user --Get's feedback by particular user {?userId}
router.get('/user', (req, res, next) => {
    var user_id = req.query.userId;
    if (!user_id) { res.status(500).json({ error: err }); }
    Feedback.find({ user_id: user_id })
        .exec()
        .then(docs => {
            // console.log(docs.toObject())
            const response = {
                count: docs.length,
                data: docs.map(doc => {
                    return {
                        userId: user_id,
                        feedback: doc.feedback
                    }
                })
            }
            res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: err });
        });
});


//POST /feedback/voucher
router.post('/voucher', (req, res, next) => {
    // Restaurant.findById(req.body.restaurantId)
    Restaurant.find({ "vouchers": { _id: req.body.voucherId } })
        .then(restaurant => {
            console.log(restaurant);
            if (!restaurant) {
                return res.status(404).json({
                    message: "Restaurant not found"
                })
            }
            console.log("Found");
        })
    User.findById(req.body.userId)
        .then(user => {
            console.log(user);
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                })
            }
            const feedback = new Feedback({
                _id: mongoose.Types.ObjectId(),
                restaurant_id: req.body.restaurantId,
                voucher_id: req.body.voucherId,
                user_id: req.body.userId,
                feedback: req.body.feedback,
            });
            return feedback.save();
        })
        .then(result => {
            console.log(result);
            res.status(201).json({
                message: "Feedback Logged",
                feedback: result
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        })
})



module.exports = router;