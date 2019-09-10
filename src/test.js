const http = require('http')
const util = require('util')
var casual = require('casual')

const data = Buffer.from(JSON.stringify({ 'david': 'vazquez' }))

const doRequest = (cb) => {

  const key = casual.word

  const opt = {
    host: 'localhost',
    port: 3000,
    method: 'PUT',
    path: `/${key}`,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }

  const req = http.request(opt, res => {

  })

  req.on('error', console.error)

  req.write(data)
  req.end(cb)
}

const doRequestPromise = util.promisify(doRequest);

console.time('all items')
;(async () => {
  
  const pending = []
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  for(let i = 0; i < 100; i++) {
    pending.push(doRequestPromise())
  }
  
  await Promise.all(pending)
  console.timeEnd('all items')
})()

