const {app, BrowserWindow} = require('electron')
const genericPool = require('generic-pool')
const async2 = require('async')

let pool

const factory = {
  create: function () {
    return new Promise(function (resolve, reject) {
      win = new BrowserWindow({
        show: false,
        webPreferences: {
          images: false
        }
      })
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

function load (url, cb) {
  pool.acquire().then((win) => {
    win.loadURL(url)
    win.webContents.on('did-finish-load', function (event) {
      win.webContents.removeAllListeners('did-finish-load')
      pool.release(win).then(() => {
        cb()
      })
      .catch((err) => {
        console.log(err)
      })
    })
  })
}

if (app.dock) {
  app.dock.hide()
}

app.on('ready', () => {
  pool = genericPool.createPool(factory, {min: 1, max: 10})
  callbacks = []
  console.time('benchmark')
  for (var i = 0; i < 1000; i++) {
    callbacks.push((cb) => {
      load(`file://${__dirname}/test.html`, cb)
    })
  }

  async2.parallel(callbacks, (err, result) => {
    console.timeEnd('benchmark')
    app.quit()
  })
})
