const path = require('path');
const {
    createLogger,
    format,
    transports
} = require('winston');
const dateFormat = require('date-fns/format');

const options = {
    file: {
        level: 'info',
        filename: path.normalize('common/logs/app.log'),
        zippedArchive: false,
        handleExceptions: true,
        humanReadableUnhandledException: true,
        maxsize: 5242880, // 5MB
        format: format.combine(
            format.label({
                label: dateFormat(new Date(), '[dd/MMM/yyyy:HH:mm:ss +0000]')
            }),
            format.ms(),
            format.timestamp({
                format: 'YYYY-MM-DD hh:mm:ss a'
            }),
            format.json()
        )
    },
    console: {
        level: 'info',
        handleExceptions: true,
        humanReadableUnhandledException: true,
        format: format.combine(format.colorize(), format.simple())
    }
};

const logger = createLogger({
    transports: [
        new transports.File(options.file),
        new transports.Console(options.console)
    ],
    exceptionHandlers: [
        new transports.File(options.file),
        new transports.Console(options.console)
    ],
    exitOnError: false
});

logger.stream = {
    write: (message, encoding) => {
        logger.info(message);
    }
};

module.exports = logger;