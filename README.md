electron-pdf
============

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Downloads][downloads-image]][downloads-url]
[![js-standard-style][standard-image]][standard-url]

A command line tool to generate PDF from URL, HTML or Markdown files with [electron](http://electron.atom.io/).

I have a blog post explain why [PDF Generation On The Web](https://fraserxu.me/2015/08/20/pdf-generation-on-the-web/)

Production ready? See it in action for the [Myanmar Election](https://wiredcraft.com/blog/high-security-electron-js-application/)!

Install
-------

```
npm install electron-pdf -g
```

For gnu/linux installations without a graphical environment:

```bash
$ sudo apt-get install xvfb # or equivalent
$ export DISPLAY=':99.0'
$ Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
$ electron-pdf ...
```

There is also an example docker machine [here](https://github.com/fraserxu/docker-tape-run).

Usage
-----

### To generate a PDF from a HTML file

```
$ electron-pdf index.html ~/Desktop/index.pdf
```

### To generate a PDF from a Markdown file

```
$ electron-pdf index.md ~/Desktop/index.pdf
```

### To generate a PDF from a Markdown file with custom CSS(defaut to Github markdown style)

```
$ electron-pdf index.html ~/Desktop/index.pdf -c my-awesome-css.css
```

### To generate a PDF from a URL

```
$ electron-pdf https://fraserxu.me ~/Desktop/fraserxu.pdf
```

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
try {
    // IE doesn't support this but that's ok, it runs it in Electron/Chrome
    document.body.dispatchEvent(new Event('view-ready'))
} catch (e){}
```

### More

```

  A command line tool to generate PDF from URL, HTML or Markdown files

  Options
    --help                     Show this help
    --version                  Current version of package
    -i | --input               String - The path to the HTML file or url
    -o | --output              String - The path of the output PDF
    
    --browserConfig            String - A valid JSON String that will be parsed into the options passed to electron.BrowserWindow
    -c | --css                 String - The path to custom CSS
    -b | --printBackground     Boolean - Whether to print CSS backgrounds.
                                 false - default
    -s | --printSelectionOnly  Boolean - Whether to print selection only
                                 false - default
    -p | --pageSize            String - Can be A3, A4, A5, Legal, Letter, Tabloid or an Object containing height and width in microns
                                "A4" - default
    -l | --landscape           Boolean - true for landscape, false for portrait.
                                 false - default
    -m | --marginsType          Integer - Specify the type of margins to use
                                 0 - default
                                 1 - none
                                 2 - minimum
    -d | --disableCache        Disable HTTP caching
    -w | --outputWait          Integer – Time to wait (in MS) between page load and PDF creation.  If used in conjunction with -e this will override the default timeout of 10 seconds
    -e | --waitForJSEvent      String - The name of the event to wait before PDF creation
                               'view-ready' - default
    

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
