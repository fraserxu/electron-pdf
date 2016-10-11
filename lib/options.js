
//  TODO: Generate Usage Doc from argv options

var options = {
  booleans: ['printBackground', 'landscape', 'printSelectionOnly'],
  alias: {
    'input': 'i',
    'output': 'o',

    'browserConfig': [],
    'cookie': ['cookies'],
    'css': 'c',
    'disableCache': 'd',
    'help': 'h',
    'landscape': 'l',
    'marginsType': ['m', 'marginType'],
    'outputWait': 'w',
    'pageSize': 'p',
    'printBackground': 'b',
    'printSelectionOnly': 's',
    'version': 'v'
  },
  default: {
    'landscape': false,
    'marginsType': 1,
    'outputWait': 0,
    'pageSize': 'A4',
    'printBackground': true,
    'printSelectionOnly': false
  }
}

module.exports = options
