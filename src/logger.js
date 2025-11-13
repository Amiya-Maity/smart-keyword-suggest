// JS counterpart for the TS logger so generated/handwritten .js files can use it
const LOG_PREFIX = "[smart-keyword-suggest]";

function info(...args) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function error(...args) {
  console.error(LOG_PREFIX, ...args);
}

function debug(...args) {
  console.debug(LOG_PREFIX, ...args);
}

module.exports = { info, warn, error, debug, LOG_PREFIX };
