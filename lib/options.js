
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
    // Do not run printToPDF, useful if the page downloads a file that needs captured instead of a PDF
    // Currently only supports a single import url
    'noprint': [],
    'marginsType': ['m', 'marginType'],
    'orientation': ['o', 'orientations'],
    'outputWait': 'w',
    'pageSize': 'p',

    // JSON String of key/value pairs (e.g. `{"Authentication": "Bearer Token"}` )
    'requestHeaders': 'r',

    'printBackground': 'b',
    'printSelectionOnly': 's',
    'trustRemoteContent': 't',
    'type': ['type'],
    'version': 'v',
    'waitForJSEvent': 'e'
  },
  default: {
    'landscape': false,
    'marginsType': 1,
    'noprint': false,
    'outputWait': 0,
    'pageSize': 'A4',
    'printBackground': true,
    'printSelectionOnly': false,
    'trustRemoteContent': false
  }
}

module.exports = options
