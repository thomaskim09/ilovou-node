const fs = require("fs");
const faker = require("faker");
const mongoose = require("mongoose");

var tagsObj = {}; // empty object
var key = "tags";
tagsObj[key] = []; // empty array, which you can push() values into

foodTagsList = [
  "Beef",
  "Bread",
  "Bubble Tea",
  "Cereal",
  "Chicken",
  "Chinese Food",
  "Coffee",
  "Desserts",
  "Dumplings",
  "Fish & Chips",
  "Fish",
  "Halal Food",
  "Halal",
  "Hamburger",
  "Hamburger",
  "Hot Dogs",
  "Hot Pot",
  "Ice Cream",
  "Indian Food",
  "Japanese Food",
  "Kim Chi",
  "Korean Food",
  "Meat",
  "Noodles",
  "Pancake",
  "Pasta",
  "Pies",
  "Pizza",
  "Porridge",
  "Ramen",
  "Salads",
  "Sandwich",
  "Sauces",
  "Seafood",
  "Soup",
  "Spagetti",
  "Steak",
  "Steam",
  "Stews",
  "Sushi",
  "Tea",
  "Thai Food",
  "Vegetables",
  "Western Food"
];

keywordList = ["nearby", "in"];

areaList = ["Skudai"];

restaurantTypeList = [
  "Asian",
  "Asian",
  "Bakery",
  "Barbecue",
  "Bars & Pubs",
  "Bistro",
  "Brunch",
  "Buffet",
  "Cafeteria",
  "Café",
  "Casual",
  "Chinese Noodles",
  "Chinese",
  "Coffeehouse",
  "Dessert",
  "Dim Sum",
  "Diners",
  "Dougnut Shop",
  "Drinks",
  "Drive-thru",
  "Ethnic",
  "Family Style",
  "Fast Casual",
  "Fast Food",
  "German",
  "Halal",
  "Health Food",
  "Hoagies",
  "Hot Pot",
  "Indian",
  "International",
  "Italian",
  "Japanese",
  "Juice Bar",
  "Korean BBQ",
  "Korean",
  "Malay",
  "Malaysian",
  "Mamak",
  "Noodle Shop",
  "Pizza",
  "Seafood",
  "Steamboat",
  "Sushi",
  "Taiwanese",
  "Teppanyaki",
  "Thai",
  "Vegetarian",
  "Western"
];

var tags = {
  area: [],
  postcode: [],
  state: [],
  areaKnowAs: [],
  restaurantType: [],
  foodTags: []
};

for (var tagCounter = 0; tagCounter < foodTagsList.length; tagCounter++) {
  tags.foodTags.push({
    _id: mongoose.Types.ObjectId(),
    name: foodTagsList[tagCounter]
  });
}

for (var tagCounter = 0; tagCounter < restaurantTypeList.length; tagCounter++) {
  tags.restaurantType.push({
    _id: mongoose.Types.ObjectId(),
    name: restaurantTypeList[tagCounter]
  });
}

// Push this newly generated restaurant to the array
tagsObj[key].push(tag);

// write array into JSON file
fs.writeFile(
  __dirname + "/tagsFaker.data.json",
  JSON.stringify(tagsObj),
  "utf8",
  function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully write data to json");
    }
  }
);
