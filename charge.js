var parseArgs = require('minimist')
var fs = require('fs')
var path = require('path')
var pkg = require('./package.json')
var Exporter = require('./index')

var argOptions = {
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

//  TODO: Generate Usage Doc from argv options

var argv = parseArgs(process.argv.slice(2), argOptions)
var input = argv._[0] || argv.input
var output = argv._[1] || argv.output

if (argv.version) {
  console.log('v' + pkg.version)
  process.exit(0)
}

if (argv.help || !input || !output) {
  usage(1)
} else {
  var exporter = new Exporter()
  exporter.on('charged', () => {
    exporter.runExport(input, output, argv, () => {
      console.log('Export Complete')
      exporter.stop()
    })
  })
  exporter.start()
}

function usage (code) {
  var rs = fs.createReadStream(path.join(__dirname, '/usage.txt'))
  rs.pipe(process.stdout)
  rs.on('close', function () {
    if (code) process.exit(code)
  })
}
