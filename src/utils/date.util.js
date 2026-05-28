'use strict';

const { format, parseISO } = require('date-fns');
const chalk = require('chalk');

function formatDate(d)     { return d ? format(parseISO(d), 'dd/MM/yyyy') : chalk.gray('—'); }
function formatDateTime(d) { return d ? format(parseISO(d), 'dd/MM/yyyy HH:mm') : chalk.gray('—'); }

module.exports = { formatDate, formatDateTime };
