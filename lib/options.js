
//  TODO: Generate Usage Doc from argv options

var options = {
  boolean: ['printBackground', 'landscape', 'printSelectionOnly', 'trustRemoteContent'],
  alias: {
    'input': 'i',
    'output': 'o',

    'acceptLanguage': [],

    // JSON String
    'browserConfig': [],

    'cookie': ['cookies'],
    'css': 'c',
    'disableCache': 'd',
    'help': 'h',
    'landscape': 'l',
    'marginsType': ['m', 'marginType'],
    'orientation': ['o', 'orientations'],
    'outputWait': 'w',
    'pageSize': 'p',

    // JSON String of key/value pairs (e.g. `{"Authentication": "Bearer Token"}` )
    'requestHeaders': 'r',

    'printBackground': 'b',
    'printSelectionOnly': 's',
    'trustRemoteContent': 't',
    'version': 'v',
    'waitForJSEvent': 'e'
  },
  default: {
    'landscape': false,
    'marginsType': 1,
    'outputWait': 0,
    'pageSize': 'A4',
    'printBackground': true,
    'printSelectionOnly': false,
    'trustRemoteContent': false
  }
}

module.exports = options
