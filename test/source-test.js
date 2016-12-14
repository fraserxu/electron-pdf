import {test} from 'ava'

var Source = require('../lib/source')
var source = new Source()

test('resolve() handles a string', t => {
  source.resolve('http://www.google.com').then(result => {
    t.is(result[0], 'http://www.google.com')
  })
})

test('resolve() handles arrays of strings', t => {
  source.resolve(['http://www.google.com', 'local.html']).then(result => {
    t.is(result.length, 2)
  })
})

test('resolve() converts markdown to html', t => {
  source.resolve(['./README.md'], {}).then(result => {
    t.is(result.length, 1)
    t.truthy(result[0].endsWith('.html'))
  })
})
