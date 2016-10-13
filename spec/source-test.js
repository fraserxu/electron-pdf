/* eslint-env jasmine */

var Source = require('../lib/source')
var source = new Source()

describe('resolve', () => {
  it('handles a string', () => {
    let result = source.resolve('http://www.google.com')
    expect(result[0]).toBe('http://www.google.com')
  })

  it('handles arrays of strings', () => {
    let result = source.resolve(['http://www.google.com', 'local.html'])
    expect(result.length).toBe(2)
  })
})
