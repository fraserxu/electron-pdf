import { test } from 'ava'

import Args from '../lib/args'

test('encode empty', t => {
  const args = {}
  const encoded = Args.encode(args)
  t.deepEqual(encoded, '%7B%7D')
})

test('file with query string', t => {
  const url = '/test/file.html?p=hello&n=world'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html?p=hello&n=world#%7B%7D')
})

test('file with no query string', t => {
  const url = '/test/file.html'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html#%7B%7D')
})

test('http url with query string', t => {
  const url = 'http://electronpdf.com/test/file.html?p=hello'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html?p=hello#%7B%7D')
})
