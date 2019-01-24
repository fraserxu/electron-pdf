import { test } from 'ava'

// var path = require('path')
// var spawn = require('child_process').spawn
// var electronPath = require('electron')

import ElectronPDF from '../lib/index'

// var indexPath = path.resolve(path.join(__dirname, '../lib/charge.js'))
// var electron = spawn(electronPath, [indexPath])
//
// test.after.always('guaranteed cleanup', t => {
//    electron.kill()
// });

test.skip('Initialization triggers ready event', t => {
  const pdf = new ElectronPDF()
  pdf.on('charged', () => {
    t.pass()
  })
  pdf.start()
})
