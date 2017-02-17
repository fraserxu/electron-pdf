const debugLib = require('debug')
const errorLogger = debugLib('electronpdf:error:')
const infoLogger = debugLib('electronpdf:info:')
const debugLogger = debugLib('electronpdf:debug:')

// https://github.com/winstonjs/winston#logging-levels
const LEVELS = {
  error: 0,
  info: 2,
  debug: 4
}

const loggers = {
  0: errorLogger,
  2: infoLogger,
  4: debugLogger
}

/**
 * Accepts an object to override one or more loggers.  Provide a function for
 * one of the following log levels.  The function should accept varargs to be
 * logged.
 *
 * {
 *   error: function
 *   info: function
 *   debug : function
 * }
 * @param loggers
 */
function set (loggerObj) {
  if (loggerObj) {
    loggers[LEVELS.error] = loggerObj.error || loggers[LEVELS.error]
    loggers[LEVELS.info] = loggerObj.info || loggers[LEVELS.info]
    loggers[LEVELS.debug] = loggerObj.debug || loggers[LEVELS.debug]
  }
}

function error () {
  loggers[LEVELS.error](...arguments)
}

function info () {
  loggers[LEVELS.info](...arguments)
}

function debug () {
  loggers[LEVELS.debug](...arguments)
}

module.exports = info
module.exports.info = info
module.exports.debug = debug
module.exports.error = error
module.exports.set = set

