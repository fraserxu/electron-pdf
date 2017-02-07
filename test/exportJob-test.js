import {test} from 'ava'
import _ from 'lodash'
import validator from 'validator'

import ExportJob from '../lib/exportJob'

const micronDims = {
  width: 304800,
  height: 228600
}

const args = {}
const options = {
  pageSize: JSON.stringify(micronDims)
}

let job = new ExportJob(['input'], 'output.pdf', args, options)

// Construction
/**
 * API expects an array, but guard against a string input
 * and add it to an array
 */
test('constructor_input_singleString', t => {
  let job = new ExportJob('input', 'output.pdf', options)
  t.deepEqual(job.input, ['input'])
})

// BrowserWindow Options
test('getBrowserConfiguration_sessionPartitionForCookies', t => {
  const args = _.extend({cookies: []}, options)

  const config = job._getBrowserConfiguration(args)

  const partition = config.webPreferences.partition
  t.true(validator.isUUID(partition), 'partition should be a UUID')
})

test('getBrowserConfiguration_noSessionPartitionUnlessCookies', t => {
  const config = job._getBrowserConfiguration(options)
  t.falsy(config.webPreferences.partition)
})

// Page Dimensions
test('getPageDimensions_Letter_Portrait', t => {
  const dim = job._getPageDimensions('Letter', false)
  t.deepEqual(dim, {x: 816, y: 1056})
})

test('getPageDimensions_Letter_Landscape', t => {
  const dim = job._getPageDimensions('Letter', true)
  t.deepEqual(dim, {x: 1056, y: 816})
})

test('getPageDimensions_object_landscapeIsDisregarded', t => {
  const dim = job._getPageDimensions(micronDims, true)
  t.deepEqual(dim, {
    x: ExportJob.HTML_DPI * 12,
    y: ExportJob.HTML_DPI * 9
  })
})

// File Generation
test('getTargetFile', t => {
  const fileName = job._getTargetFile(2)
  t.is(fileName, 'output.pdf')
})

test('getTargetFile_multiple_inputs', t => {
  job = new ExportJob(['input1', 'input2'], 'output.pdf', options)
  const fileName = job._getTargetFile(1)
  t.is(fileName, 'output_2.pdf')
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

// PDF Completion Tests

test.cb('handlePDF_electronError', t => {
  const cb = (e, d) => {
    t.is(e, 'error occurred')
    t.end()
  }
  job._handlePDF('output.pdf', cb, 'error occurred', undefined)
})

test.cb('handlePDF_inMemory', t => {
  // Arrange
  const opts = _.extend({}, options, {inMemory: true})
  const inMemJob = new ExportJob(['input'], 'output.pdf', {}, opts)
  let windowEventData
  inMemJob.on('window.capture.end', (event) => {
    windowEventData = event.data
  })
  const err = undefined
  const data = 'binaryPDFDataWouldGoHere'

  // Assert
  const cb = (e, d) => {
    t.is(d, windowEventData) // the window.capture.end event was emitted with data
    t.is(d, data) // The raw data was returned and not a filepath
    t.end()
  }

  // Act
  inMemJob._handlePDF('output.pdf', cb, err, data)
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
