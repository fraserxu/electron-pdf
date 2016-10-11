/* eslint-env jasmine */

var ElectronPDF = require('../index')

describe('Initialization', () => {
  it('triggers ready event', (done) => {
    const pdf = new ElectronPDF()
    pdf.on('charged', done)
    pdf.start()
  })
})
