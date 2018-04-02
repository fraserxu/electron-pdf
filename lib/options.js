
//  TODO: Generate Usage Doc from argv options

var options = {
  boolean: ['printBackground', 'landscape', 'printSelectionOnly', 'trustRemoteContent', 'waitForJSEvent'],
  alias: {
    'input': 'i',
    'output': 'o',

    'acceptLanguage': [],
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
    'trustRemoteContent': false,
    'waitForJSEvent': false
  }
}

module.exports = options
