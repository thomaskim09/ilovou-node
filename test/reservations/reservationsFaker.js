const fs = require("fs");
const faker = require("faker");
const mongoose = require("mongoose");

var reservations = [];

for (
  var reservationCounter = 0;
  reservationCounter <= 3;
  reservationCounter++
) {
  // generate reservation details
  reservations.push({
    _id: mongoose.Types.ObjectId(),
    userId: mongoose.Types.ObjectId(),
    reservationDate: faker.date.recent(),
    reservationTime: faker.date.recent(),
    dinningPax: faker.random.number(5).toString(),
    isReservationAccepted: faker.random.boolean()
  });
  // 60% of reservation has remark
  if (faker.random.number(10) <= 6) {
    reservations[reservationCounter].remark = faker.hacker.phrase();
  }
}

// write array into JSON file
fs.writeFile(
  __dirname + "/reservationsFaker.data.json",
  JSON.stringify(reservations),
  "utf8",
  function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully write data to json");
    }
  }
);
