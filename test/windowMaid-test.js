import { test } from 'ava'

import WindowMaid from '../lib/windowMaid'

test('_cleanupHungWindows cleans up non destroyed window', t => {
  // Used to fail the test if emit() and destroy() are not invoked
  t.plan(3)

  let job = {
    id: 'jobId',
    window: {id: 1, isDestroyed: () => false},
    emit: (event, context) => {
      t.is(event, 'window.termination')
    },
    destroy: () => {
      t.pass('we expected destruction and it happened!')
    }
  }

  WindowMaid.registerOpenWindow(job)
  WindowMaid.cleanupHungWindows(-1)
  t.is(WindowMaid.windowCount(), 0)
})

test('_cleanupHungWindows handles destroyed window', t => {
  let job = {
    id: 'jobId',
    window: {id: 1, isDestroyed: () => true},
    emit: (event, context) => {
      t.fail('no events were expected')
    },
    destroy: () => {
      t.fail('Calling destroy on an already destroyed window is not allowed')
    }
  }

  WindowMaid.registerOpenWindow(job)
  WindowMaid.cleanupHungWindows(-1)
  t.is(WindowMaid.windowCount(), 0)
})
