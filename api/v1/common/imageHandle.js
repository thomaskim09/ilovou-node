const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const winston = require('../utils/winston');
const environments = require('../utils/environments');

// Internal file function start
module.exports.getDirectory = () => {
  // Direct to sub domain images folder
  let rootDir;
  let folderDir;
  if (environments.isProd) {
    rootDir = path.normalize('/var/www/vhosts/vouchy.com.my/httpdocs');
    folderDir = path.join('ilovou-images', 'images');
  } else {
    rootDir = path.normalize(path.dirname(require.main.filename)).slice(0, -12);
    folderDir = path.join('testingfolder', 'images');
  }
  // Get folderName
  const today = new Date();
  const month = String(today.getMonth() + 1);
  const monthProcessed = month.length === 2 ? month : `0${month}`;
  const folderName = today.getFullYear() + monthProcessed;
  return {
    rootDir: rootDir,
    folderDir: folderDir,
    folderName: folderName
  };
};
// Internal file function end

module.exports.uploadBase64File = (type, base64String) => {
  const base64Image = base64String.split(';base64,').pop();
  const dir = this.getDirectory();
  // Check files existence
  const finalDir = path.join(dir.rootDir, dir.folderDir, dir.folderName);
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir);
  }
  // Writes file to folder
  const imageName = `${type}_${new mongoose.Types.ObjectId()}`;
  const imagePath = path.join(finalDir, `${imageName}.jpg`);
  fs.writeFile(imagePath, base64Image, {
    encoding: 'base64'
  }, (err) => {
    if (err) throw err;
    winston.info(`${imageName}.jpg created - ${Buffer.byteLength(JSON.stringify(base64Image))}`);
  });
  const folderSubDir = `images/${dir.folderName}`;
  // Sub domain or
  let URIPath;
  if (environments.isProd) {
    URIPath = `https://images.vouchy.com.my/${folderSubDir}/${imageName}.jpg`;
  } else {
    URIPath = `http://192.168.0.166:3000/public/${folderSubDir}/${imageName}.jpg`;
  }
  return URIPath;
};

module.exports.deleteFile = (imageURL) => {
  const splitResult = imageURL.split('/');
  const folderName = splitResult[splitResult.length - 2];
  const fileName = splitResult[splitResult.length - 1];
  const dir = this.getDirectory();
  // Check files existence
  const finalDir = path.join(dir.rootDir, dir.folderDir, folderName);
  if (!fs.existsSync(finalDir)) {
    return;
  }
  // Delete file from folder
  const folderSubDir = path.join(finalDir, fileName);
  fs.unlink(folderSubDir, (err) => {
    winston.info(`${fileName} deleted`);
  });
};

module.exports.checkIfUrl = (base64String) => {
  const regex = /(ftp|http|https):\/\//;
  const result = regex.test(base64String);
  return result;
};