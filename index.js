const {app, BrowserWindow} = require('electron')
const genericPool = require('generic-pool')
const async2 = require('async')
const { ipcMain } = require('electron')

const TIMEOUT = 7000 // 7secs
const URL = `file://${__dirname}/test.html`

let pool
let promises = {}

const factory = {
  create: function () {
    return new Promise(function (resolve, reject) {
      var win = new BrowserWindow({
        show: false,
        webPreferences: {
          images: false,
          sandbox: true,
          preload: `${__dirname}/injector.js`
        }
      })
      // win.openDevTools()
      resolve(win)
    })
  },
  destroy: function (win) {
    return new Promise(function (resolve) {
      console.log('Destroyed')
      win.destroy()
      resolve(win)
    })
  }
}

function done (id, err, html) {
  let p = promises[id]
  if (p) {
    p.resolve({err, html})
    delete promises[id]
  }
}

function load (url, cb) {
  pool.acquire().then((win) => {
    let id = win.id
    let loadTimeout
    return new Promise((resolve, reject) => {
      win.loadURL(url)
      loadTimeout = setTimeout(function () {
        done(id, 'Timeout')
      }, TIMEOUT)
      promises[id] = {resolve, reject}
    })
    .then((result) => {
      clearTimeout(loadTimeout)
      win.webContents.stop() // Stop the window before releasing
      pool.release(win).then(() => {
        cb(result.err, result.html)
      })
    })
  })
  .catch((err) => {
    cb(err)
  })
}

if (app.dock) {
  app.dock.hide()
}

app.on('ready', () => {
  pool = genericPool.createPool(factory, {min: 1, max: 10})
  var callbacks = []
  console.time('benchmark')
  for (var i = 0; i < 1000; i++) {
    callbacks.push((cb) => {
      load(URL, (err, html) => {
        if (err) {
          (err === 'Timeout') ? cb() : cb(err)
        } else {
          cb()
        }
      })
    })
  }

  ipcMain.on('dom-loaded', function (event, html) {
    done(event.sender.webContents.id, null, html)
  })

  async2.parallel(callbacks, (err, result) => {
    if (err) {
      console.error(err)
    }
    console.timeEnd('benchmark')
    app.quit()
  })
})
