// Third Party Modules
// const _ = require('lodash')

// Logging
// const debug = require('debug')
// const logger = debug('electronpdf:')

/** Used to calculate browser dimensions based on PDF size */
const HTML_DPI = 96

/** Used to determine browser size using a Micron -> Inch -> Pixel conversion */
const MICRONS_INCH_RATIO = 25400

/**
 * The tailor is responsible for all the sizing and layout of the window
 */
module.exports = {

  /** Used to calculate browser dimensions based on PDF size */
  HTML_DPI: HTML_DPI,

  /**
   * sets the window size based on the pageSize and orientation
   * If the window size has not changed no action will be taken.
   *
   * @param {string} pageSize One of the Electron supported sizes
   * @param {boolean} landscape true if the windows should be in landscape
   *   orientation
   */
  setWindowDimensions (pageSize, landscape) {
    const pageDim = this.getPageDimensions(pageSize, landscape)
    var size = this.window.getSize()
    if (size[0] !== pageDim.x || size[1] !== pageDim.y) {
      this.emit('window.resize', {dimensions: pageDim})
      this.window.setSize(pageDim.x, pageDim.y)
    }
  },

  /**
   * Translates PDF output size into the browser pixels required to
   * match that size/aspect-ration.
   *
   * @param pageSize
   * @param landscape
   * @returns {{x: {number}, y: {number}}}
   * @private
   */
  getPageDimensions (pageSize, landscape) {
    function pdfToPixels (inches) {
      return Math.floor(inches * HTML_DPI)
    }

    const pageDimensions = {
      'A3': {x: pdfToPixels(11.7), y: pdfToPixels(16.5)},
      'A4': {x: pdfToPixels(8.3), y: pdfToPixels(11.7)},
      'A5': {x: pdfToPixels(5.8), y: pdfToPixels(8.3)},
      'Letter': {x: pdfToPixels(8.5), y: pdfToPixels(11)},
      'Legal': {x: pdfToPixels(8.5), y: pdfToPixels(14)},
      'Tabloid': {x: pdfToPixels(11), y: pdfToPixels(17)}
    }

    let pageDim
    if (typeof pageSize === 'object') {
      const xInches = pageSize.width / MICRONS_INCH_RATIO
      const yInches = pageSize.height / MICRONS_INCH_RATIO

      pageDim = {
        x: pdfToPixels(xInches),
        y: pdfToPixels(yInches)
      }
    } else {
      pageDim = pageDimensions[pageSize]
      if (landscape && pageDim.x < pageDim.y) {
        pageDim = landscape ? {x: pageDim.y, y: pageDim.x} : pageDim  // flip
      }
    }
    return pageDim
  }
}
