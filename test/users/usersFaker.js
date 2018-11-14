const fs = require("fs");
const faker = require("faker");
const mongoose = require("mongoose");

var userObj = {}; // empty object
var key = "user";
userObj[key] = []; // empty array, which you can push() values into

for (var userCounter = 1; userCounter <= 3; userCounter++) {
  var user = {
    _id: mongoose.Types.ObjectId(),
    name: faker.name.findName()
  };

  // Push this newly generated restaurant to the array
  userObj[key].push(user);
}

// write array into JSON file
fs.writeFile(
  __dirname + "/usersFaker.data.json",
  JSON.stringify(userObj),
  "utf8",
  function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully write data to json");
    }
  }
);
