import { test } from 'ava'

import Args from '../lib/args'

test('file with query string and arguments', t => {
  const url = '/test/file.html?p=hello&n=world'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html?p=hello&n=world#%7B%7D')
})

test('file with query string and no arguments', t => {
  const url = '/test/file.html?p=hello&n=world'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html?p=hello&n=world')
})

test('file with no query string but with arguments', t => {
  const url = '/test/file.html'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html#%7B%7D')
})

test('file with no query string and no arguments', t => {
  const url = '/test/file.html'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html')
})

test('file with query string and arguments in URL', t => {
  const url = '/test/file.html?p=hello&n=world#!/123'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html?p=hello&n=world#!/123')
})

test('file with no query string and with arguments in URL', t => {
  const url = '/test/file.html#!/123'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html#!/123')
})

test('file with query string replacing arguments from URL', t => {
  const url = '/test/file.html?p=hello&n=world#!/123'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html?p=hello&n=world#%7B%7D')
})

test('file with no query string and with arguments in URL', t => {
  const url = '/test/file.html#!/123'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'file:///test/file.html#!/123')
})

test('http url with query string and arguments', t => {
  const url = 'http://electronpdf.com/test/file.html?p=hello'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html?p=hello#%7B%7D')
})

test('http url with query string and no arguments', t => {
  const url = 'http://electronpdf.com/test/file.html?p=hello'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html?p=hello')
})

test('http url with no query string but with arguments', t => {
  const url = 'http://electronpdf.com/test/file.html'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html#%7B%7D')
})

test('http url with no query string and no arguments', t => {
  const url = 'http://electronpdf.com/test/file.html'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html')
})

test('http url with query string and arguments in URL', t => {
  const url = 'http://electronpdf.com/test/file.html?p=hello#!/123'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html?p=hello#!/123')
})

test('http url with no query string and with arguments in URL', t => {
  const url = 'http://electronpdf.com/test/file.html#!/123'
  const args = null
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html#!/123')
})

test('http url with query string replacing arguments from URL', t => {
  const url = 'http://electronpdf.com/test/file.html?p=hello#!/123'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html?p=hello#%7B%7D')
})

test('http url with no query string replacing arguments in URL', t => {
  const url = 'http://electronpdf.com/test/file.html#!/123'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'http://electronpdf.com/test/file.html#%7B%7D')
})

test('https url', t => {
  const url = 'https://electronpdf.com/test/file.html#!/123'
  const args = {}
  const newUrl = Args.urlWithArgs(url, args)
  t.deepEqual(newUrl, 'https://electronpdf.com/test/file.html#%7B%7D')
})
