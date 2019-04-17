electron-pdf
============

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Downloads][downloads-image]][downloads-url]
[![js-standard-style][standard-image]][standard-url]

A command line tool to generate PDF from URL, HTML or Markdown files with [electron](http://electron.atom.io/).

I have a blog post explain why [PDF Generation On The Web](https://fraserxu.me/2015/08/20/pdf-generation-on-the-web/)

Production ready? See it in action for the [Myanmar Election](https://wiredcraft.com/blog/high-security-electron-js-application/)!

Versioning
-------
Starting with version 4.0.x the master branch will always have the latest electron version.

Semantic Versioning is used, and corresponds to electron versions in the following way:
- electron-pdf 4.0.x  =>  electron 4.0.x (Chromium 69, Node 10.11.0)
- electron-pdf 1.3.x  =>  electron 1.6.x (Chromium 56, Node 7.4)
- electron-pdf 1.2.x  =>  electron 1.4.x (Chromium 53, Node 6.5)

Note: The Chromium versions employed by electron have impacts based on the functionality you may be exporting.  
Choose the version you need based on Chromium.

Install
-------

```
npm install electron-pdf
```

Note: If you're installing electron-pdf as root using the system level npm (vs a user-level install like with NVM) then you may need to run the following command instead:

```
sudo npm install electron-pdf -g --unsafe-perm
```

Please see [the npm docs](https://docs.npmjs.com/misc/config#unsafe-perm) for more information.


For gnu/linux installations without a graphical environment:

```bash
$ sudo apt-get install xvfb # or equivalent
$ export DISPLAY=':99.0'
$ Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
$ electron-pdf ...
```

There is also an example docker machine [here](https://github.com/fraserxu/docker-tape-run).

Node Usage
-----
Electron PDF can be used inside of an application, or more commonly as the engine for a pdf 
rendering service.  For instance, to handle http requests using Express.  The following snippets 
show you how you can get started.

### The application must run in an Electron process

In `package.json`
```json
"start": "DEBUG=electronpdf:* electron index.js",
"watch": "DEBUG=electronpdf:* nodemon --exec electron index.js"
```

### You can use the same instance

```javascript
var ElectronPDF = require('electron-pdf')
var express = require('express')
var bodyParser = require('body-parser')
var app = express()
app.use(bodyParser.json())

var exporter = new ElectronPDF()
exporter.on('charged', () => {
	//Only start the express server once the exporter is ready
	app.listen(port, hostname, function() {
		console.log(`Export Server running at http://${hostname}:${port}`);
	})
})
exporter.start()
```

### And handle multiple export job instances

```javascript
app.post('/pdfexport', function(req,res){
	// derive job arguments from request here
	// 
	const jobOptions = {
	  /**
	    r.results[] will contain the following based on inMemory
          false: the fully qualified path to a PDF file on disk
          true: The Buffer Object as returned by Electron
	    
	    Note: the default is false, this can not be set using the CLI
	   */
	  inMemory: false 
	}
	const options = {
  		pageSize : "A4"
	}
	exporter.createJob(source, target, options, jobOptions).then( job => {
	job.on('job-complete', (r) => {
    		console.log('pdf files:', r.results)
    		// Process the PDF file(s) here
    	})
    	job.render()
	})	
})
```

#### Using an in memory Buffer

If you set the `inMemory` setting to true, you must also set `closeWindow=false`
or you will get a segmentation fault anytime the window is closed before the buffer 
is sent on the response.  You then need to invoke `job.destroy` to close the window.

Sample Code:
```javascript
const jobOptions = { inMemory: true, closeWindow: false }
exporter.createJob(source, target, options, jobOptions).then( job => {
	job.on('job-complete', (r) => {
	  //Send the Buffer here
	  process.nextTick(() => {job.destroy()})
	})
})
```

## Events

The API is designed to emit noteworthy events rather than use callbacks.
Full documentation of all events is a work in progress.

Command Line Usage
-----

For Ad-hoc conversions, Electron PDF comes with support for a CLI.

### To generate a PDF from a HTML file

```
$ electron-pdf index.html ~/Desktop/index.pdf
```

### To generate a PDF from a Markdown file

```
$ electron-pdf index.md ~/Desktop/index.pdf
```

### To generate a PDF from a Markdown file with custom CSS (defaults to Github markdown style)

```
$ electron-pdf index.html ~/Desktop/index.pdf -c my-awesome-css.css
```

### To generate a PDF from a URL

```
$ electron-pdf https://fraserxu.me ~/Desktop/fraserxu.pdf
```

Rendering Options
-----
Electron PDF gives you complete control of how the BrowserWindow should be configured, and when 
the window contents should be captured.

### To specify browser options

The [BrowserWindow supports many options](https://github.com/electron/electron/blob/master/docs/api/browser-window.md#new-browserwindowoptions) which you
 may define by passing a JSON Object to the `--browserConfig` option.
 
Some common use cases may include:

* `height` and `width` - electron-pdf calculates the browser height and width based off of the 
dimensions of PDF page size multiplied by the HTML standard of 96 pixels/inch.  So only set these
 values if you need to override this behavior
* `show` - to display the browser window during generation

```
$ electron-pdf https://fraserxu.me ~/Desktop/fraserxu.pdf --browserConfig '{"show":true}'
```

### To generate a PDF after the an async task in the HTML

```
electron-pdf ./index.html ~/Desktop/README.pdf -e
```

In your application, at the point which the view is ready for rendering

```javascript
document.body.dispatchEvent(new Event('view-ready'))
```

**Warning:** It is possible that your application will be ready and emit the event before the main electron process has had a chance execute the javascript in the renderer process which listens for this event.  

If you are finding that the [event is not effective](https://github.com/fraserxu/electron-pdf/issues/169) and your page waits until the full timeout has occurred, then you should use `setInterval` to emit the event until it is acknowledged like so:

```javascript
  var eventEmitInterval = setInterval(function () {
    document.body.dispatchEvent(new Event('view-ready'))
  }, 25)

  document.body.addEventListener('view-ready-acknowledged', function(){
    clearInterval(eventEmitInterval)
  })
```

When the main process first receives your ready event it will emit a single acknowlegement on `document.body` with whatever event name you are using suffixed with `-acknowledged`.  So the default would be `view-ready-acknowledged`

#### Observing your own event

If the page you are rending is under your control, and you wish to modify the behavior
of the rendering process you can use a [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
and an observer that will be triggered after the view is ready but before it is captured.

##### your-page.html

```javascript
document.body.dispatchEvent(new CustomEvent('view-ready', { detail: {layout: landscape} }))
```

##### your-exporter.js
As an example, suppose you wanted to change the orientation of the PDF

```javascript
job.observeReadyEvent( (detail) => {
    return new Promise( (resolve,reject) => {
      if( detail && detail.landscape ){
        job.changeArgValue('landscape', true)
      }
      resolve()
    })
})
```

All Available Options
-----

Electron PDF exposes the printToPDF settings (i.e. pageSize, orientation, margins, etc.) 
available from the Electron API.  See the following options for usage.

```

  A command line tool to generate PDF from URL, HTML or Markdown files

  Options
    --help                     Show this help
    --version                  Current version of package
    
    -i | --input               String - The path to the HTML file or url
    -o | --output              String - The path of the output PDF
    
    -b | --printBackground     Boolean - Whether to print CSS backgrounds.
    
    --acceptLanguage           String - A valid value for the 'Accept-Language' http request header
    
    --browserConfig            String - A valid JSON String that will be parsed into the options passed to electron.BrowserWindow
    
    -c | --css                 String - The path to custom CSS (can be specified more than once)
    
    -d | --disableCache        Disable HTTP caching
                                 false - default
    
    -e | --waitForJSEvent      String - The name of the event to wait before PDF creation
                                 'view-ready' - default
    
    -l | --landscape           Boolean - true for landscape, false for portrait (don't pass a string on the CLI, just the `-l` flag)
                                 false - default
    
    -m | --marginsType         Integer - Specify the type of margins to use
                                 0 - default margins
                                 1 - no margins (electron-pdf default setting)
                                 2 - minimum margins
    
    --noprint                  Boolean - Do not run printToPDF, useful if the page downloads a file that needs captured instead of a PDF.  
                                         The Electron `win.webContents.session.on('will-download')` event will be implemented 
                                         and the file saved to the location provided in `--output`.
                                         Currently only supports a single import url.
                                         The page is responsible for initiating the download itself.
    
    -p | --pageSize            String - Can be A3, A4, A5, Legal, Letter, Tabloid or an Object containing height and width in microns
                                 "A4" - default
    
    -r | --requestHeaders      String - A valid JSON String that will be parsed into an Object where each key/value pair is: <headerName>: <headerValue>
                                 Example: '{"Authorization": "Bearer token", "X-Custom-Header": "Hello World"}'  
    
    -s | --printSelectionOnly  Boolean - Whether to print selection only
                                 false - default
                                 
    -t | --trustRemoteContent  Boolean - Whether to trust remote content loaded in the Electron webview.  False by default.                               
    
    -w | --outputWait          Integer – Time to wait (in MS) between page load and PDF creation.  
                                         If used in conjunction with -e this will override the default timeout of 10 seconds    
```

Find more information on [Electron Security here](https://github.com/electron/electron/blob/master/docs/tutorial/security.md).

Debugging
-----

## Sentry
If you have a [Sentry](https://sentry.io) account and setup a new app to get a new DSN, you can set a `SENTRY_DSN` environment variable which will activate sentry logs.
See `lib/sentry.js` for implementation details.

This will allow you to easily see/monitor errors that are occuring inside of the Chromium renderer (browser window).
It also automatically integrates with Electron's [Crash Reporter](https://electronjs.org/docs/api/crash-reporter)


CLI Usage
-----    

You can see some additional logging (if you're getting errors or unexpected output) by setting `DEBUG=electron*`
For example: `DEBUG=electron* electron-pdf <input> <output> -l`

```
  Usage
    $ electron-pdf <input> <output>
    $ electron-pdf <input> <output> -l

  Examples
    $ electron-pdf http://fraserxu.me ~/Desktop/fraserxu.pdf
    $ electron-pdf ./index.html ~/Desktop/index.pdf
    $ electron-pdf ./README.md ~/Desktop/README.pdf -l
    $ electron-pdf ./README.md ~/Desktop/README.pdf -l -c my-awesome-css.css

```

Inspired by [electron-mocha](https://github.com/jprichardson/electron-mocha)

### Other Formats

Want to use the same options, but export to PNG or snapshot the rendered HTML?
Just set the output filename to end in .png or .html instead!

```
  Examples
    $ electron-pdf http://fraserxu.me ~/Desktop/fraserxu.pdf
    $ electron-pdf http://fraserxu.me ~/Desktop/fraserxu.html
    $ electron-pdf http://fraserxu.me ~/Desktop/fraserxu.png

```

### Extensions

If you need powerpoint support, [pdf-powerpoint](https://www.npmjs.com/package/pdf-powerpoint) 
picks up where Electron PDF leaves off by converting each page in the PDF to a PNG and placing 
them on individual slides.


### License

MIT

[npm-image]: https://img.shields.io/npm/v/electron-pdf.svg?style=flat-square
[npm-url]: https://npmjs.org/package/electron-pdf
[travis-image]: https://img.shields.io/travis/fraserxu/electron-pdf/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/fraserxu/electron-pdf
[downloads-image]: http://img.shields.io/npm/dm/electron-pdf.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/electron-pdf
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: https://github.com/feross/standard
