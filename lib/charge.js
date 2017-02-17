const parseArgs = require('minimist')
const fs = require('fs')
const path = require('path')

const pkg = require('../package.json')
const Exporter = require('./index')
const argOptions = require('./options')
const logger = require('./logger')

const argv = parseArgs(process.argv.slice(2), argOptions)
const input = argv._[0] || argv.input
const output = argv._[1] || argv.output

if (argv.version) {
  console.log('v' + pkg.version)
  process.exit(0)
}

if (argv.help || !input || !output) {
  usage(1)
} else {
  const exporter = new Exporter()
  exporter.on('charged', () => {
    exporter.createJob(input, output, argv).then(job => {
      job.on('job-complete', () => {
        logger('Export Complete')
        exporter.stop()
      })
      job.render()
    })
  })
  exporter.start()
}

function usage (code) {
  const rs = fs.createReadStream(path.join(__dirname, '../usage.txt'))
  rs.pipe(process.stdout)
  rs.on('close', function () {
    if (code) process.exit(code)
  })
}
