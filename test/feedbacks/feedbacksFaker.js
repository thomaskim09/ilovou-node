const fs = require("fs");
const faker = require("faker");
const mongoose = require("mongoose");

var feedbackObj = {}; // empty object
var key = "feedback";
feedbackObj[key] = []; // empty array, which you can push() values into

for (var feedbackCounter = 1; feedbackCounter <= 3; feedbackCounter++) {
  var feedback = {
    profileImage: faker.image.avatar(),
    userName: faker.name.findName(),
    userRated: faker.random.number({ min: 1, max: 5 }).toString(),
    feedbackContent: faker.lorem.paragraph(),
    feedbackTime: faker.date.recent(),
    imageUploadeds: [],
    restaurantReplyStatus: faker.random.boolean().toString()
  };

  for (
    var imageCounter = 1;
    imageCounter <= faker.random.number(3);
    imageCounter++
  ) {
    feedback.imageUploadeds.push(faker.image.food());
  }

  if (feedback.restaurantReplyStatus == "true") {
    feedback.restaurantReplyContent = faker.lorem.paragraph();
  }

  // Push this newly generated restaurant to the array
  feedbackObj[key].push(feedback);
}

// write array into JSON file
fs.writeFile(
  __dirname + "/feedbacksFaker.data.json",
  JSON.stringify(feedbackObj),
  "utf8",
  function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully write data to json");
    }
  }
);
