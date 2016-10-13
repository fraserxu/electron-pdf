'use strict'

var path = require('path')
// var wargs = require('./args')
var markdownToHTMLPath = require('./markdown')

class Source {

  /**
   * Given a single URL String or an array of URLs return an array with any
   * transformations applied (i.e. markdown processor)
   *
   * @param input
   * @param args
   * @returns {Array}
   */
  resolve (input, args) {
    let result
    if (input instanceof Array) {
      result = input.map((i) => {
        return this.markdown(i, args)
      })
    } else {
      result = [this.markdown(input, args)] // wargs.urlWithArgs(this.markdown(input, args), {})
    }
    return result
  }

  markdown (input, args) {
    let targetInput = input

    if (this._isMarkdown(input)) {
      var opts = {}
      if (args.css) {
        opts.customCss = args.css
      }

      // if given a markdown, render it into HTML and return the path of the HTML
      input = markdownToHTMLPath(input, opts, (err, tmpHTMLPath) => {
        if (err) {
          console.error('Parse markdown file error', err)
        }
        targetInput = tmpHTMLPath
      })
    }
    return targetInput
  }

  _isMarkdown (input) {
    var isMd = false
    if (input instanceof String) {
      var ext = path.extname(input)
      isMd = ext.indexOf('md') > 0 || ext.indexOf('markdown') > 0
    }
    return isMd
  }
}

module.exports = Source
