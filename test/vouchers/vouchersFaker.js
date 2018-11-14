const fs = require("fs");
const faker = require("faker");
const mongoose = require("mongoose");

var voucherObj = {}; // empty object
var key = "vouchers";
voucherObj[key] = []; // empty array, which you can push() values into

voucherTypeList = ["cashVoucher", "quantityVoucher", "setVoucher"];

// generate vouchers
var vouchers = [];

for (
  var voucherCount = 1;
  voucherCount <= faker.random.number(5);
  voucherCount++
) {
  var voucher = {
    _id: mongoose.Types.ObjectId(),
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
          groupPricePerUnit: (parseFloat(voucher.newPrice) - 10)
            .toFixed(2)
            .toString()
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
        setTitle: faker.hacker.noun(),
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
  for (voucherRule = 0; voucherRule <= faker.random.number(9); voucherRule++) {
    voucher.voucherRules.ruleDetails.push(faker.hacker.phrase());
  }

  // Push this newly generated voucher to the array
  voucherObj[key].push(voucher);
}

// write array into JSON file
fs.writeFile(
  __dirname + "/vouchersFaker.data.json",
  JSON.stringify(voucherObj.vouchers),
  "utf8",
  function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully write data to json");
    }
  }
);
