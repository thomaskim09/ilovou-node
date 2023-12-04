const tickets = require('../tickets/ticketsModel');
const ticketsReservation = require('../tickets/tickets_reservationModel');
const winston = require('../utils/winston');
const errHan = require('../common/errorHandle');

module.exports.getUniqueCode = () => {
    const number = new Date().valueOf();
    const text = String(number);
    const first = text.slice(0, 8);
    const last = text.slice(-5);
    const total = Number(first) + Number(last);
    return total;
};

module.exports.changeTicketStatus = (ticketId, status, res) => {
    tickets.findOneAndUpdate({
        '_id': ticketId
    }, {
        'status': status
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: Ticket status to ${status} (tckId:${ticketId})`);
        if (res) {
            return res.status(201).json();
        }
    });
};

module.exports.changeTicketReservationStatus = (ticketId, status, res) => {
    ticketsReservation.findOneAndUpdate({
        '_id': ticketId
    }, {
        'status': status
    }, {
        projection: {
            '_id': 1
        }
    }, (err, result) => {
        if (err) {
            return errHan.commonError(err, res);
        }
        winston.info(`UPDATE: Ticket reservation status to ${status} (tckId:${ticketId})`);
        if (res) {
            return res.status(201).json();
        }
    });
};