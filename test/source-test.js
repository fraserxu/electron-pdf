import {test} from 'ava'

var Source = require('../lib/source')
var source = new Source()

test('resolve() handles a string', t => {
  let result = source.resolve('http://www.google.com')
  t.is(result[0], 'http://www.google.com')
})

test('resolve() handles arrays of strings', t => {
  let result = source.resolve(['http://www.google.com', 'local.html'])
  t.is(result.length, 2)
})

