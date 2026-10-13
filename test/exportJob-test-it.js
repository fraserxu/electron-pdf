import test from 'ava'

import electron from 'electron'

import ExportJob from '../lib/exportJob'

const args = {}
const options = {
  pageSize: 'Letter'
}
let job = new ExportJob(['input'], 'output.pdf', args, options)

// Ready Event, wait times
test('_readyEventTimeout removes ipc listener', t => {
  const generateFunction = () => {}
  const ipcListener = job._attachIPCListener('myEvent', generateFunction)
  t.is(electron.ipcMain.listenerCount('READY_TO_RENDER'), 1)
  job._proceedWithExport('myEvent', ipcListener, generateFunction)
  t.is(electron.ipcMain.listenerCount('READY_TO_RENDER'), 0)
})

/**
 * ipcMain is global to the main process, so a listener a job fails to remove
 * outlives that job entirely.  The normal removal paths only run when the
 * ready event arrives or the wait times out; a job terminated mid-render hits
 * neither, and so leaked a listener -- and everything its closure retained --
 * for every abandoned resource, for the lifetime of the process.
 */
test.serial('destroy removes ipc listeners the job never consumed', t => {
  const abandoned = new ExportJob(['a', 'b'], 'output.pdf', args, options)
  const baseline = electron.ipcMain.listenerCount('READY_TO_RENDER')

  abandoned._attachIPCListener('myEvent', () => {})
  abandoned._attachIPCListener('myEvent', () => {})
  t.is(electron.ipcMain.listenerCount('READY_TO_RENDER'), baseline + 2)

  abandoned.destroy()

  t.is(electron.ipcMain.listenerCount('READY_TO_RENDER'), baseline,
    'a job that dies mid-render must not leak listeners for the process lifetime')
})

test.serial('destroy is safe to call when nothing was attached', t => {
  const unused = new ExportJob(['a'], 'output.pdf', args, options)
  const baseline = electron.ipcMain.listenerCount('READY_TO_RENDER')

  t.notThrows(() => unused.destroy())
  t.is(electron.ipcMain.listenerCount('READY_TO_RENDER'), baseline)
})
