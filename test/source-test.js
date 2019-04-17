import test from 'ava'

var Source = require('../lib/source')
var source = new Source()
var fs = require('then-fs')

test('resolve() handles a string', async t => {
  source.resolve('http://www.google.com').then(result => {
    t.is(result[0], 'http://www.google.com')
  })
})

test('resolve() handles arrays of strings', async t => {
  source.resolve(['http://www.google.com', 'local.html']).then(result => {
    t.is(result.length, 2)
  })
})

test('resolve() converts markdown to html', async t => {
  source.resolve(['./README.md'], {}).then(result => {
    t.is(result.length, 1)
    t.truthy(result[0].endsWith('.html'))
  })
})

test('resolve() does not attempt to convert weird urls', async t => {
  source.resolve(['https://www.google.com/?q=dr.+vs.+md'], {}).then(result => {
    t.is(result.length, 1)
    t.is(result[0], 'https://www.google.com/?q=dr.+vs.+md')
  })
})

test('resolve() includes custom css file', async t => {
  t.plan(1)

  var result = await source.resolve(['./README.md'], { css: 'custom.css' })
  var data = await fs.readFile(result[0], 'utf-8')

  t.regex(data, /.*custom\.css.*/g)
})

test('resolve() includes multiple custom css files', async t => {
  t.plan(2)

  var result = await source.resolve(['./README.md'], { css: ['first.css', 'second.css'] })
  var data = await fs.readFile(result[0], 'utf-8')

  t.regex(data, /.*first\.css.*/g)
  t.regex(data, /.*second\.css.*/g)
})

test('resolve() skips undefined css', async t => {
  t.plan(1)

  var result = await source.resolve(['./README.md'], { })
  var exists = await fs.exists(result[0])

  t.true(exists)
})
