import test from 'ava'

import Tailor from '../lib/windowTailor'

const windowLetterDim = [816, 1056]
const micronDims = {
  width: 304800,
  height: 228600
}

test('getPageDimensions_Letter_Portrait', t => {
  const dim = Tailor.getPageDimensions('Letter', false)
  t.deepEqual(dim, { x: 816, y: 1056 })
})

test('getPageDimensions_Letter_Landscape', t => {
  const dim = Tailor.getPageDimensions('Letter', true)
  t.deepEqual(dim, { x: 1056, y: 816 })
})

test('getPageDimensions_object_landscapeIsDisregarded', t => {
  const dim = Tailor.getPageDimensions(micronDims, true)
  t.deepEqual(dim, {
    x: Tailor.HTML_DPI * 12,
    y: Tailor.HTML_DPI * 9
  })
})

test('setWindowDimensions_returns undefined when size is unchanged', t => {
  const win = {
    getSize () { return windowLetterDim }
  }
  t.is(Tailor.setWindowDimensions(win, 'Letter', false), undefined)
})

test('setWindowDimensions_returns dimension object when size changed', t => {
  t.plan(3)
  const win = {
    getSize () { return windowLetterDim },
    setSize (x, y) {
      t.is(x, windowLetterDim[1])
      t.is(y, windowLetterDim[0])
    }
  }
  const newDim = Tailor.setWindowDimensions(win, 'Letter', true)
  // This is used to emit a change event, so it's important to validate
  // these names exactly; should not be changed for backwards compatibility
  const expected = { dimensions: { x: windowLetterDim[1], y: windowLetterDim[0] } }
  t.deepEqual(newDim, expected)
})
