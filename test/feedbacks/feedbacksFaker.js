const fs = require("fs");
const faker = require("faker");

userIdList = ["1", "2", "3", "4", "5"];

feedbacks = [];

for (var feedbackCounter = 1; feedbackCounter <= 3; feedbackCounter++) {
  var feedback = {
    profileImage: faker.image.avatar(),
    userId: faker.random.arrayElement(userIdList),
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
  feedbacks.push(feedback);
}

// write array into JSON file
fs.writeFile(
  __dirname + "/feedbacksFaker.data.json",
  JSON.stringify(feedbacks),
  "utf8",
  function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully write data to json");
    }
  }
);
