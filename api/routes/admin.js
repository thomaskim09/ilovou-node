const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const keys = require('../../keys');

//Schema Dependentcies
const Admin = require('../models/admin');
// const Restaurant = require('../models/restaurant');

//POST /admin/signup
router.post('/signup', (req, res, next) => {
    Admin.find({ email: req.body.email })
        .exec()
        .then(admin => {
            if (admin.length >= 1) {
                return res.status(409).json({
                    message: 'Email already taken.'
                })
            } else {
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        return res.status(500).json({
                            error: err
                        })
                    } else {
                        const admin = new Admin({
                            _id: new mongoose.Types.ObjectId(),
                            firstName: req.body.firstName,
                            lastName: req.body.lastName,
                            email: req.body.email,
                            password: hash
                        });
                        admin
                            .save()
                            .then(result => {
                                console.log(result);
                                res.status(200).json({
                                    message: "Admin Account Created"
                                })
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(500).json({
                                    error: err
                                });
                            });
                    }
                });
            }
        })
});

router.post('/login', (req, res, next) => {
    Admin.find({ email: req.body.email })
        .exec()
        .then(admin => {
            if (admin.length < 1) {
                return res.status(401).json({
                    message: 'Auth failed'
                })
            }
            console.log(admin[0]);
            //Verifies password by de-salting
            bcrypt.compare(req.body.password, admin[0].password, (err, result) => {
                if (err) {
                    return res.status(401).json({
                        message: 'Auth failed'
                    })
                }
                if (result) {
                    const token = jwt.sign({
                            email: admin[0].email,
                            id: admin[0]._id,
                            firstName: admin[0].firstName,
                            lastName: admin[0].lastName
                        },
                        keys.jwt.key, {
                            expiresIn: "1h"
                        }
                    );
                    console.log('Bearer ' + token);
                    return res.status(200).json({
                        message: "Auth successful",
                        token: token
                    });
                }
                res.status(401).json({
                    message: "Auth failed"
                });

            })

        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});

router.delete("/:adminId", (req, res, next) => {
    Admin.remove({ _id: req.body.adminId })
        .exec()
        .then(result => {
            res.status(200).json({
                message: "Admin deleted"
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});

module.exports = router;