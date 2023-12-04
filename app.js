const express = require('express');
const path = require('path');
const environments = require('./api/v1/utils/environments');

const app = express();

// Version control for API, can list more below
app.use('/v1', require('./api/v1/app'));

// To serve images to users during testing
if (!environments.isProd) {
  const rootDir = path.dirname(require.main.filename).replace(/\\/g, `/`);
  const outsideDir = `${rootDir.slice(0, -12)}/testingfolder`;
  app.use('/public', express.static(outsideDir));
}

module.exports = app;