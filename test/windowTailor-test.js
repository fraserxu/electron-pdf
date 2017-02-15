import { test } from 'ava'

import Tailor from '../lib/windowTailor'

const micronDims = {
  width: 304800,
  height: 228600
}

test('getPageDimensions_Letter_Portrait', t => {
  const dim = Tailor.getPageDimensions('Letter', false)
  t.deepEqual(dim, {x: 816, y: 1056})
})

test('getPageDimensions_Letter_Landscape', t => {
  const dim = Tailor.getPageDimensions('Letter', true)
  t.deepEqual(dim, {x: 1056, y: 816})
})

test('getPageDimensions_object_landscapeIsDisregarded', t => {
  const dim = Tailor.getPageDimensions(micronDims, true)
  t.deepEqual(dim, {
    x: Tailor.HTML_DPI * 12,
    y: Tailor.HTML_DPI * 9
  })
})
