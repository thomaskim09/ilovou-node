const fs = require("fs");
const faker = require("faker");
const mongoose = require("mongoose");
const Hashids = require("hashids");
const limax = require("limax");

voucherIdList = ["1", "2", "3", "4", "5"];

restaurantTypeList = [
  "Bakery",
  "Barbecue",
  "Bars & Pubs",
  "Buffet",
  "Bistro",
  "Café",
  "Coffeehouse",
  "Diners",
  "Dougnut Shop",
  "Drinks",
  "Drive-thru",
  "Ethnic",
  "Fast Casual",
  "Halal",
  "Western",
  "Juice Bar",
  "Vegetarian",
  "Dessert",
  "Asian",
  "International"
];

areaList = [
  "Sutera Mall",
  "Permas Jaya",
  "Austin Height",
  "Bukit Indah",
  "Tiram",
  "Puteri Wangsa",
  "Johor Jaya",
  "Larkin",
  "Stulang",
  "Perling",
  "Kempas"
];

maxReservationDayList = ["30", "45", "60"];

restaurants = [];

// Assign new restaurants with random data
for (var restaurantCounter = 1; restaurantCounter <= 3; restaurantCounter++) {
  var restaurant = {
    _id: mongoose.Types.ObjectId(),
    details: {
      restaurantName: faker.company.companyName(),
      restaurantProfileImage: faker.image.business(),
      restaurantGallery: [],
      address: {
        street: faker.address.streetName(),
        area: faker.random.arrayElement(areaList),
        postcode: "81300",
        city: "Johor Bahru",
        state: "Johor",
        country: "Malaysia"
      },
      rating: faker.finance.amount(1, 5, 1),
      restaurantType: faker.random.arrayElement(restaurantTypeList),
      costPerPax: faker.finance.amount(1, 40, 0),
      currency: "RM",
      currencyCode: "MYR",
      routineRestDay: [faker.finance.amount(1, 7, 0)],
      businessHours: [],
      contact: faker.phone.phoneNumberFormat(),
      hasMenu: faker.random.boolean().toString(),
      hasReservation: faker.random.boolean().toString()
    },
    vouchers: [],
    searchTags: []
  };

  // for safer and cleaner url
  restaurant.details.urlSlug = limax(restaurant.details.restaurantName);
  var hashids = new Hashids("RedBean Coder");
  restaurant.details.hashId = hashids.encodeHex(restaurant._id);

  // Combining address properties to full address
  restaurant.details.fullAddress =
    restaurant.details.address.street +
    " " +
    restaurant.details.address.area +
    " " +
    restaurant.details.address.postcode +
    " " +
    restaurant.details.address.city +
    " " +
    restaurant.details.address.state +
    " " +
    restaurant.details.address.country;

  // Place for basic idea of the place
  restaurant.details.shortAreaName = restaurant.details.address.area;

  // Place what people normally recognized
  restaurant.details.areaKnownAs = restaurant.details.address.area;

  // Assign gallery image to restaurant gallery
  for (
    var galleryCount = 0;
    galleryCount <= faker.random.number({ min: 1, max: 2 });
    galleryCount++
  ) {
    restaurant.details.restaurantGallery.push({
      categoryId: mongoose.Types.ObjectId(),
      categoryName: faker.hacker.noun(),
      categoryImages: []
    });
    for (
      var imagesCount = 1;
      imagesCount <= faker.random.number({ min: 1, max: 4 });
      imagesCount++
    ) {
      restaurant.details.restaurantGallery[galleryCount].categoryImages.push(
        faker.image.food()
      );
    }
  }

  // Assign business hour to restaurants
  for (var routineDayCounter = 1; routineDayCounter <= 7; routineDayCounter++) {
    if (routineDayCounter == restaurant.details.routineRestDay) {
      restaurant.details.businessHours.push({
        day: routineDayCounter,
        openTime: "null",
        closeTime: "null"
      });
    } else {
      restaurant.details.businessHours.push({
        day: routineDayCounter,
        openTime: "12:00:00",
        closeTime: "23:00:00"
      });
    }
  }
  ///////////////////////////////////////////////////////////////////////////////////

  for (
    var voucherCounter = 0;
    voucherCounter <= faker.random.number({ min: 1, max: 4 });
    voucherCounter++
  ) {
    restaurant.vouchers.push(faker.random.arrayElement(voucherIdList));
  }

  ///////////////////////////////////////////////////////////////////////////////////

  if (restaurant.details.hasReservation == "true") {
    restaurant.reservation = {
      reservationSettings: {
        maxReservationDay: faker.random.arrayElement(maxReservationDayList),
        holidays: [],
        paxSettings: {
          minPax: faker.finance.amount(1, 5, 0),
          maxPax: faker.finance.amount(5, 30, 0)
        }
      },
      reservationDetails: []
    };

    // reservations settings
    for (
      holidayCount = 0;
      holidayCount <= faker.random.number(6);
      holidayCount++
    ) {
      restaurant.reservation.reservationSettings.holidays.push({
        holidayName: faker.hacker.noun(),
        holidayDate: faker.date.recent(1)
      });
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////

  // search tags
  for (tagsCount = 1; tagsCount <= 5; tagsCount++) {
    restaurant.searchTags.push(faker.hacker.noun());
  }

  ///////////////////////////////////////////////////////////////////////////////////

  // Push this newly generated restaurant to the array
  restaurants.push(restaurant);
}

// write array into JSON file
fs.writeFile(
  __dirname + "/restaurantsFaker.data.json",
  JSON.stringify(restaurants),
  "utf8",
  function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully write data to json");
    }
  }
);
