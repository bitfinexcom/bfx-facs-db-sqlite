/* eslint-env mocha */

'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')
const { facCaller } = require('./helper')

const Fac = require('..')

const tmpDir = path.join(__dirname, 'tmp')

function call (fn) {
  return new Promise((resolve, reject) => fn((err, res) => err ? reject(err) : resolve(res)))
}

test('table option', async (t) => {
  await t.test('creates tables if they do not exist', async (t) => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    fs.mkdirSync(tmpDir, { recursive: true })

    const fac = new Fac(facCaller, {
      db: path.join(__dirname, 'tmp', 'test2.db'),
      dirConf: path.join(__dirname, 'fixtures'),
      runSqlAtStart: [
        'CREATE TABLE IF NOT EXISTS fruits (id INTEGER PRIMARY KEY ASC, sold, price)',
        'CREATE TABLE IF NOT EXISTS shops (id INTEGER PRIMARY KEY ASC, location)'
      ]
    })
    await call((cb) => fac._start(cb))

    t.teardown(async () => {
      await new Promise((resolve) => fac._stop(() => resolve()))
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    const tables = await call((cb) => fac.db.all(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
      cb
    ))
    t.alike(tables, [{ name: 'fruits' }, { name: 'shops' }])
  })
})
