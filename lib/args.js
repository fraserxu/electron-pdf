var assert = require('assert')
var assign = require('object-assign')
var url = require('url')

function encode (args) {
  assert.strictEqual(typeof args, 'object', 'args must be an object')
  // stringify the args
  args = args ? encodeURIComponent(JSON.stringify(args)) : ''
  return args
}

function urlWithArgs (urlOrFile, args) {
  args = encode(args)

  var u
  var urlData = url.parse(urlOrFile)
  if (urlOrFile.indexOf('http') === 0) {
    var hash = args || urlData.hash
    u = url.format(assign(urlData, { hash: hash }))
  } else { // presumably a file url
    u = url.format({
      protocol: 'file',
      pathname: url.parse(urlOrFile).pathname,
      search: url.parse(urlOrFile).query,
      slashes: true,
      hash: args || urlData.hash
    })
  }

  return u
}

module.exports = {
  encode: encode,
  urlWithArgs: urlWithArgs
}
