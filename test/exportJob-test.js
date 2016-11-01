import {test} from 'ava'

import ExportJob from '../lib/exportJob'
const job = new ExportJob()

test('getPageDimensions_Letter_Portrait', t => {
  const dim = job._getPageDimensions('Letter', false)
  t.deepEqual(dim, {x: 816, y: 1056})
})

test('getPageDimensions_Letter_Landscape', t => {
  const dim = job._getPageDimensions('Letter', true)
  t.deepEqual(dim, {x: 1056, y: 816})
})

test('getPageDimensions_object', t => {
  const micronDims = {
    width: ExportJob.MICRONS_INCH_RATIO,
    height: ExportJob.MICRONS_INCH_RATIO
  }
  const dim = job._getPageDimensions(micronDims, false)
  t.deepEqual(dim, {x: ExportJob.HTML_DPI, y: ExportJob.HTML_DPI})
})

// Cookie Tests
test('setSessionCookie_single', t => {
  const cs = setupCookieStub()
  job._setSessionCookies('JSESSIONID=foo', 'http://host:port/export', cs.stub)
  t.deepEqual(cs.capture()[0], {
    url: 'http://host',
    name: 'JSESSIONID',
    value: 'foo'
  })
})

test('setSessionCookie_multiple', t => {
  const cs = setupCookieStub()
  job._setSessionCookies('C1=foo;JSESSIONID=bar;C2=baz', 'http://host', cs.stub)
  const cookies = cs.capture()
  t.is(cookies.length, 3)
  t.deepEqual(cookies[1], {
    url: 'http://host',
    name: 'JSESSIONID',
    value: 'bar'
  })
})

// Support Functions
/**
 * Stubs the windows.sessionn.cookies object and provides access
 * to the captured cookies that were set.
 *
 * @returns {{capture: *, stub: {set: cookieStub.set}}}
 */
function setupCookieStub () {
  let capturedCookies = []
  const cookieStub = {
    set: function (cookie, cb) {
      capturedCookies.push(cookie)
    }
  }
  return {
    capture: () => capturedCookies,
    stub: cookieStub
  }
}
