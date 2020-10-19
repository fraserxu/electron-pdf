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
