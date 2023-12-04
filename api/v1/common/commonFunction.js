const mongoose = require('mongoose');

module.exports.convertArrayToObjectId = (list) => {
  if (list) {
    return list.map(val => mongoose.Types.ObjectId(val));
  }
};

module.exports.convertObjectToObjectId = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null || obj[key] === undefined) {
      return;
    }
    obj[key] = mongoose.Types.ObjectId(obj[key]);
  });
  return obj;
};

module.exports.cleanObjectFields = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null || obj[key] === undefined || obj[key] === '') {
      delete obj[key];
    }
  });
};

module.exports.decodeEntities = (encodedString) => {
  if (!encodedString) {
    return;
  }
  const translateRe = /&(nbsp|amp|quot|lt|gt);/g;
  const translate = {
    'nbsp': ' ',
    'amp': '&',
    'quot': '\'',
    'lt': '<',
    'gt': '>'
  };
  return encodedString.replace(translateRe, (match, entity) => {
    return translate[entity];
  }).replace(/&#(\d+);/gi, (match, numStr) => {
    const num = parseInt(numStr, 10);
    return String.fromCharCode(num);
  });
};