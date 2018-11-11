const Restaurant = require('./restaurantsModel');

exports.get_all_restaurants = (req, res, next) => {
    Restaurant.find({})
        //.limit()
        // .select('_id name address rating')
        .exec()
        .then(docs => {
            // console.log(docs.toObject())
            const response = {
                count: docs.length,
                data: docs.map(doc => {
                    return {
                        restaurantId: doc._id,
                        details: doc.details,
                        vouchers: doc.vouchers,
                        request: {
                            type: 'GET',
                            url: 'http://localhost:3000/restaurants/details?restaurantId=' + doc._id
                        }
                    }
                })
            }
            res.status(200).json(response);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: err });
        });
};

exports.get_restaurant_details = (req, res, next) => {
    const id = req.query.restaurantId;
    if (!id) { res.status(400).json({ "message": "Missing request paramaters" }); }
    Restaurant.findById(id)
        .exec()
        .then(
            doc => {
                res.status(200).json(doc);
            })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: err });
        });
};