import test from 'ava'

import _ from 'lodash'

import validator from 'validator'

import ExportJob from '../lib/exportJob'

let job, args, options

test.beforeEach(() => {
  args = {}
  options = {
    pageSize: 'Letter'
  }
  job = new ExportJob(['input'], 'output.pdf', args, options)
})

// Construction
/**
 * API expects an array, but guard against a string input
 * and add it to an array
 */
test('constructor_input_singleString', t => {
  let job = new ExportJob('input', 'output.pdf', options)
  t.deepEqual(job.input, ['input'])
})

test('constructor_orientations derived from landscape arg', t => {
  const options = {
    landscape: true
  }
  let job = new ExportJob(['a', 'b'], '', options)
  t.deepEqual(job.orientations, ['landscape', 'landscape'])
})

test('constructor_orientations are used when matches size of urls', t => {
  const jobOptions = {
    orientations: ['o1', 'o2']
  }
  let job = new ExportJob(['a', 'b'], '', {}, jobOptions)
  t.deepEqual(job.orientations, ['o1', 'o2'])
})

test('constructor_orientations is portrait when landscape is not set', t => {
  let job = new ExportJob('a', '', options)
  t.deepEqual(job.orientations, ['portrait'])
})

// BrowserWindow Options
test('getBrowserConfiguration_sessionPartitionForCookies', t => {
  const args = _.extend({ cookies: [] }, options)

  const config = job._getBrowserConfiguration(args)

  const partition = config.webPreferences.partition
  t.true(validator.isUUID(partition), 'partition should be a UUID')
})

test('getBrowserConfiguration_SessionPartitionWithoutCookies', t => {
  const config = job._getBrowserConfiguration(options)
  const partition = config.webPreferences.partition
  t.true(validator.isUUID(partition), 'partition should be a UUID')
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

// Header Tests
test.only('_getHeaders all possible headers', t => {
  args.acceptLanguage = 'en'
  args.disableCache = true
  args.requestHeaders = `{"H1": "V1", "H2": "V2"}`
  const headers = job._getHeaders()
  const expected = [
    'pragma: no-cache',
    'H1: V1',
    'H2: V2'
  ]
  t.deepEqual(headers, expected)
})

test('_getHeaders empty', t => {
  const headers = job._getHeaders()
  const expected = []
  t.deepEqual(headers, expected)
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
  const opts = _.extend({}, options, { inMemory: true })
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
