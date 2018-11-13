const fs = require("fs");
const faker = require("faker");
const mongoose = require("mongoose");

var restaurantsObj = {}; // empty object
var key = "restaurant";
restaurantsObj[key] = []; // empty array, which you can push() values into

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

voucherTypeList = ["cashVoucher", "quantityVoucher", "setVoucher"];

maxReservationDayList = ["30", "45", "60"];

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

  // generate vouchers for restaurant
  var vouchers = [];

  for (
    var voucherCount = 1;
    voucherCount <= faker.random.number(5);
    voucherCount++
  ) {
    var voucher = {
      voucherId: mongoose.Types.ObjectId(),
      voucherImage: faker.image.food(),
      voucherName: faker.company.companyName(),
      voucherType: faker.random.arrayElement(voucherTypeList),
      newPrice: faker.finance.amount(1, 150, 2),
      quantitySold: faker.random.number(100).toString(),
      voucherRules: {
        validFrom: faker.date.recent(),
        validUntil: faker.date.future(),
        startHour: "12:00:00",
        endHour: "23:00:00",
        ruleDetails: []
      },
      status: "OP"
    };

    // 10% of vouchers has limitedQuantity
    if (faker.random.number(10) <= 1) {
      var quantitySoldValue = parseInt(voucher.quantitySold);
      voucher.limitedQuantity = faker.random
        .number({
          min: quantitySoldValue,
          max: quantitySoldValue + 30
        })
        .toString();

      if (voucher.quantitySold == voucher.limitedQuantity) {
        voucher.soldOutTime = faker.date.recent();
      }
    }

    // 10% of vouchers has limitQuantityPerUser
    if (faker.random.number(10) <= 1) {
      voucher.limitQuantityPerUser = faker.random
        .number({ min: 1, max: 3 })
        .toString();
      voucher.userReachedLimiQuantity = [];

      // 20% of limitQuantityPerUser has user purchased before
      if (faker.random.number(10) <= 2) {
        for (
          userPurchasedCounter = 0;
          userPurchasedCounter < faker.random.number(3);
          userPurchasedCounter++
        ) {
          voucher.userReachedLimiQuantity.push({
            userId: mongoose.Types.ObjectId(),
            quantityBrought: faker.random.number(
              parseInt(voucher.limitQuantityPerUser)
            )
          });
        }
      }
    }

    // basePrice will always bigger than new price
    var newPriceValue = parseFloat(voucher.newPrice);
    voucher.basePrice = faker.finance.amount(
      newPriceValue,
      newPriceValue + 50,
      2
    );

    // 10% of vouchers has limitedEndTime
    if (faker.random.number(10) <= 1) {
      // 50% limitedEndTime has passesd
      if (faker.random.number(10) <= 5) {
        voucher.limitedEndTime = faker.date.past();
      } else {
        voucher.limitedEndTime = faker.date.future();
      }
    }

    // 10% of vouchers has grabStartTime
    if (faker.random.number(10) <= 1) {
      // 50% grabStartTime has passesd
      if (faker.random.number(10) <= 5) {
        voucher.grabStartTime = faker.date.past();
      } else {
        voucher.grabStartTime = faker.date.future();
      }
    }

    // 30% of voucher will have group voucher if no has limitedQuantity
    if (
      voucher.limitedQuantity == undefined &&
      voucher.limitQuantityPerUser == undefined
    ) {
      if (faker.random.number(10) <= 3) {
        voucher.groupVoucherDetails = [];
        for (
          groupVoucherCounter = 0;
          groupVoucherCounter < faker.random.number(3);
          groupVoucherCounter++
        ) {
          voucher.groupVoucherDetails.push({
            groupQuantity: faker.random.number({ min: 1, max: 3 }).toString(),
            groupPricePerUnit: (parseFloat(voucher.newPrice) - 10).toString()
          });
        }
      }
    }

    // if vouchertype is quantity vouchers
    if (voucher.voucherType == "quantityVoucher") {
      voucher.suitablePax = "0";
      voucher.quantityDetails = [];
      for (
        quantityCounter = 0;
        quantityCounter < faker.random.number(3);
        quantityCounter++
      ) {
        voucher.quantityDetails.push({
          quantityTitle: faker.hacker.noun(),
          quantityContents: []
        });
        for (
          quantityContentCounter = 0;
          quantityContentCounter < faker.random.number({ min: 1, max: 3 });
          quantityContentCounter++
        ) {
          voucher.quantityDetails[quantityCounter].quantityContents.push({
            itemName: faker.hacker.noun(),
            itemNewPrice: faker.finance.amount(1, 30, 2)
          });
          var itemNewPriceValue = parseFloat(
            voucher.quantityDetails[quantityCounter].quantityContents[
              quantityContentCounter
            ].itemNewPrice
          );
          voucher.quantityDetails[quantityCounter].quantityContents[
            quantityContentCounter
          ].itemPreviousPrice = faker.finance.amount(
            itemNewPriceValue,
            itemNewPriceValue + 50,
            2
          );
        }
      }
    }

    // if vouchertype is set vouchers
    if (voucher.voucherType == "setVoucher") {
      voucher.suitablePax = faker.random.number(8).toString();
      voucher.setDetails = [];
      for (setCounter = 0; setCounter < faker.random.number(3); setCounter++) {
        voucher.setDetails.push({
          setTitle: faker.hacker.noun,
          setContents: []
        });
        for (
          setContentCounter = 0;
          setContentCounter < faker.random.number(3);
          setContentCounter++
        ) {
          voucher.setDetails[setCounter].setContents.push({
            setName: faker.hacker.noun(),
            setUnit: faker.random.number({ min: 1, max: 3 }),
            setPrice: faker.finance.amount(1, 30, 2)
          });
        }
      }
    }

    // generate voucher rule details
    for (
      voucherRule = 0;
      voucherRule <= faker.random.number(9);
      voucherRule++
    ) {
      voucher.voucherRules.ruleDetails.push(faker.hacker.phrase());
    }

    // Push this newly generated voucher to the array
    vouchers.push(voucher);
  }

  // put all generated vouchers to the array
  restaurant.vouchers = vouchers;

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
        holidayDate: faker.date.recent()
      });
    }

    // generate reservation details
    for (
      reservationCount = 0;
      reservationCount <= faker.random.number(6);
      reservationCount++
    ) {
      restaurant.reservation.reservationDetails.push({
        reservationId: mongoose.Types.ObjectId(),
        userId: mongoose.Types.ObjectId(),
        reservationDate: faker.date.recent(),
        reservationTime: faker.date.recent(),
        dinningPax: faker.random
          .number(
            parseInt(
              restaurant.reservation.reservationSettings.paxSettings.maxPax
            )
          )
          .toString(),
        isReservationAccepted: faker.random.boolean()
      });
      // 60% of reservation has remark
      if (faker.random.number(10) <= 6) {
        restaurant.reservation.reservationDetails[
          reservationCount
        ].remark = faker.hacker.phrase();
      }
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////

  // search tags
  for (tagsCount = 1; tagsCount <= 5; tagsCount++) {
    restaurant.searchTags.push(faker.hacker.noun());
  }

  ///////////////////////////////////////////////////////////////////////////////////

  // Push this newly generated restaurant to the array
  restaurantsObj[key].push(restaurant);
}

// write array into JSON file
fs.writeFile(
  __dirname + "/restaurantsFaker.data.json",
  JSON.stringify(restaurantsObj),
  "utf8",
  function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully write data to json");
    }
  }
);
