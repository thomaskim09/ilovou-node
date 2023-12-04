const http = require('http');
const app = require('./app');
const winston = require('./api/v1/utils/winston');

const port = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(port, () => {
  winston.info(`Running on port: ${port}`);
});