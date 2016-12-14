'use strict'

var _ = require('lodash')
var path = require('path')
// var wargs = require('./args')
var markdownToHTMLPath = require('./markdown')

// Logging
const debug = require('debug')
const logger = debug('electronpdf:')

class Source {

  /**
   * Given a single URL String or an array of URLs return an array with any
   * transformations applied (i.e. markdown processor)
   *
   * @param input
   * @param args
   * @returns {Array} of Promises
   */
  resolve (input, args) {
    const files = _.isArray(input) ? input : [input]
    // wargs.urlWithArgs(this.markdown(input, args), {})
    const promises = files.map(i => { return this.markdown(i, args) })
    return Promise.all(promises)
  }

  markdown (input, args) {
    return new Promise((resolve, reject) => {
      if (this._isMarkdown(input)) {
        var opts = {}
        if (args.css) {
          opts.customCss = args.css
        }
        // if given a markdown, render it into HTML and return the path of the HTML
        markdownToHTMLPath(input, opts, (err, tmpHTMLPath) => {
          if (err) {
            logger('Parse markdown file error', err)
            reject(err)
          }
          resolve(tmpHTMLPath)
        })
      } else {
        resolve(input)
      }
    })
  }

  _isMarkdown (input) {
    var isMd = false
    if (_.isString(input)) {
      var ext = path.extname(input).toLowerCase()
      isMd = ext.indexOf('md') > 0 || ext.indexOf('markdown') > 0
    }
    return isMd
  }
}

module.exports = Source
