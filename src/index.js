console.log(`Starting database...`);

const mkdir = require('mkdirp')
const { performance } = require('perf_hooks')
const fs = require('fs').promises
const path = require('path')
const server = require('express')
const bodyParser = require('body-parser')

const dbDir = './db'

const app = server()

app.use(bodyParser.json())

mkdir.sync(dbDir)

const validateKey = key => /\W+/g.test(key)

app.get('/:key', async (req, res) => {
  const { key } = req.params
  
  const isValidKey = !validateKey(key)

  if (!isValidKey) return res.send({ success: false, message: 'Not a valid key' })

  const possibleValue = await fs.readFile(path.resolve(dbDir, key), 'utf-8')

  res.send({ [key]: JSON.parse(possibleValue)  })
})

app.put('/:key', async (req, res) => {
  const { key } = req.params

  // console.log(`${key}`, req.body)

  try {
  
    let start = performance.now()
    await fs.writeFile(path.resolve(dbDir, key), JSON.stringify(req.body), {})
    let end = performance.now()

    // console.log({ time: end - start })
    res.send({ success: true })
  } catch(e) {
    console.log('error', e)
    res.send({ success: false, message: e.message })
  }
})

app.listen(3000)
