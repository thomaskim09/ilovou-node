const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport')

const User = require('../models/user');


//GET /auth/login/google --> Authenticate with google.
router.get('/login/google',
    passport.authenticate('google', { scope: ['profile'] })
);


//passport handles retrieval of code in query string of callback url and retrieves profile from google.
router.get('/google/redirect',
    passport.authenticate('google'),
    function(req, res) {
        console.log(req.user)
        res.send('you are logged in with: ' + req.user.name);
        // TODO: Successful authentication, redirect acoordingly.
        // res.redirect('/');

    });


//TODO: See if can be shared for all the different Oauth providers
router.get('/logout', (req, res) => {
    //handle logging out
    req.logout();
    res.status(200).json({
        message: 'User successfully logged out',
        request: {
            type: 'GET',
            url: 'http://localhost:3000/auth/login/google'
        }
    })
})



module.exports = router;