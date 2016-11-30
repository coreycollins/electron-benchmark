
var cluster = require('cluster')

// const URL = `file://${__dirname}/test.html`
const URL = `http://example.com`

if (cluster.isMaster) {
  var cpuCount = require('os').cpus().length
  var total = 0
  var done = 0

  for (var i = 0; i < cpuCount; i++) {
    cluster.fork()
  }

  console.time('benchmark')
  Object.keys(cluster.workers).forEach((id) => {
    cluster.workers[id].on('message', (msg) => {
      if (msg === 'ready') {
        cluster.workers[id].send(URL)
      } else if (msg === 'loaded') {
        total += 1
        if (total < 1000) {
          cluster.workers[id].send(URL)
        } else {
          cluster.workers[id].kill()
        }
      }
    })
  })

  cluster.on('exit', (worker, code, signal) => {
    done += 1
    if (done == cpuCount) {
      console.timeEnd('benchmark')
      process.exit(0)
    }
  })
} else if (cluster.isWorker) {
  console.log('Worker started')
  var phantom = require('phantom')

  let page
  let proc
  phantom.create(['--ignore-ssl-errors=yes', '--load-images=no']).then(function (ph) {
    proc = ph
    ph.createPage().then(function (p) {
      page = p
      process.send('ready')
    })
  })

  process.on('message', (msg) => {
    page.open(msg).then(function (status) {
      page.property('plainText').then((con) => {
        console.log(con)
        process.send('loaded')
      })
    })
    .catch((err) => {
      console.log(err)
    })
  })
}
