import { test } from 'ava'

import _ from 'lodash'

import { set, info } from '../lib/logger'

/**
 * Shows usage for clients, and validates tha it works!
 */
test('set loggers', t => {
  let msg
  // Can set only certain loggers, and let others use debug logging
  const loggers = {
    'info': function () { msg = 'id ' + _.join(arguments, ' ') }
  }
  set(loggers)
  // all varargs should just get passed through and logged however the
  // provided logger chooses to log them
  info('then', 'args')

  t.is(msg, 'id then args')
})
