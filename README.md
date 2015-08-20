electron-pdf
============

[![Build Status](https://travis-ci.org/fraserxu/electron-pdf.svg)](https://travis-ci.org/fraserxu/electron-pdf)

Generate PDF from URL or HTML with [electron](http://electron.atom.io/)

![electron-pdf](https://cloud.githubusercontent.com/assets/1183541/9372796/6dc1089e-4715-11e5-8850-10dd9542aff8.gif)


Install
-------

```
npm install electron-pdf -g
```

Usage
-----

### Install Electron

First, you need to install Electron. You can either run:

```
npm install -g electron-prebuilt
```

and then `electron` will be added to your path. Or, you can download a version from https://github.com/atom/electron/releases and then set an environment variable ELECTRON_PATH pointing to the binary. Note if you're using Mac OS X, the path would be to the actual executable and not the app directory e.g. `/Applications/Electron.app/Contents/MacOS/Electron.`

You should probably just install `electron-prebuilt` as it simplifies things.

### Build PDF

```

  Generate pdf with electron

  Options
    --help                     Show this help
    --version                  Current version of package
    -i | --input               String - The path to the HTML file or url
    -o | --output              String - The path of the output PDF
    -b | --printBackground     Boolean - Whether to print CSS backgrounds.
                                 false - default
    -s | --printSelectionOnly  Boolean - Whether to print selection only
                                 false - default
    -l | --landscape           Boolean - true for landscape, false for portrait.
                                 false - default
    -m | --marginType          Integer - Specify the type of margins to use
                                 0 - default
                                 1 - none
                                 2 - minimum

  Usage
    $ electron-pdf <input> <output>
    $ electron-pdf <input> <output> -l

  Examples
    $ electron-pdf http://fraserxu.me ~/Desktop/fraserxu.pdf
    $ electron-pdf http://fraserxu.me ~/Desktop/fraserxu.pdf -l

```

Inspired by [electron-mocha](https://github.com/jprichardson/electron-mocha)

### License

MIT
