var marked = require('marked')
var fs = require('fs')
var os = require('os')
var path = require('path')
var uuid = require('time-uuid')

/**
 * parse the markdown content and write it to system tmp directory
 * @param  {String} input Path of the markdown file
 * @param  {Object} options Markdown parser options
 * @return {Function}         The callback function with HTML path
 */
module.exports = function (input, options, cb) {

  if (options instanceof Function) {
    cb = options
    options = {}
  }

  marked.setOptions({
    renderer: options.renderer || new marked.Renderer(),
    gfm: options.gfm || true,
    tables: options.tables || true,
    breaks: options.breaks || false,
    pedantic: options.pedantic || false,
    sanitize: options.sanitize || true,
    smartLists: options.smartLists || true,
    smartypants: options.smartypants || false
  })

  fs.readFile(input, function (err, markdownContent) {
    if (err) {
      cb(err)
    }

    var htmlContent = marked(markdownContent.toString())
    var tmpHTMLPath = path.join(os.tmpdir(), path.parse(input).name + '-' + uuid() + '.html')

    fs.writeFile(tmpHTMLPath, htmlContent, function (err) {
      if (err) {
        cb(err)
      }

      cb(null, tmpHTMLPath)
    })
  })

}
