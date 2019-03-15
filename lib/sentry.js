if (process.env.SENTRY_DSN) {

    require('./logger').info('SENTRY_DSN environment variable detected, enabling Sentry...')

    const { init } = require('@sentry/electron')
    const { ipcRenderer } = require('electron')

    init({
        dsn: process.env.SENTRY_DSN,
        enableNative: false,
    })

}
