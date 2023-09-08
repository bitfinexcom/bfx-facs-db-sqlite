/* eslint-env mocha */

'use strict'

const assert = require('assert')
const path = require('path')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const { facCaller } = require('./helper')

const Fac = require('../')
const crypto = require('crypto')

const tmpDir = path.join(__dirname, 'tmp')
describe('general', () => {
  let sqliteFac = null
  before(function (done) {
    rimraf.sync(tmpDir)
    mkdirp.sync(tmpDir)
    sqliteFac = new Fac(facCaller, {
      db: path.join(__dirname, 'tmp', 'test.db'),

      label: 'test',
      dirConf: path.join(__dirname, 'fixtures'),
      runSqlAtStart: [
        'CREATE TABLE IF NOT EXISTS Employees (id INTEGER PRIMARY KEY ASC, name, surname)'
      ]
    })
    sqliteFac._start(done)
  })

  beforeEach(async () => {
    sqliteFac.db.run('DELETE FROM Employees WHERE 1;')
  })

  after(function () {
    sqliteFac._stop()
    rimraf.sync(tmpDir)
  })

  it('returns an error if db directory does not exist', (done) => {
    const fac = new Fac(facCaller, {
      db: path.join(__dirname, 'foo', 'funky', 'bar.db'),
      dirConf: path.join(__dirname, 'fixtures')
    })
    fac._start(next)

    function next (err) {
      assert.ok(err instanceof Error)
      fac._stop(done)
    }
  })

  it('runAsync should return an awaitable results', async () => {
    const res = sqliteFac.runAsync('SELECT 1;')
    assert.ok(res instanceof Promise)
  })

  it('allAsync should return an awaitable results', async () => {
    const num = crypto.randomBytes(16).toString('hex')
    const res = await sqliteFac.allAsync('SELECT ? as num;', [num])
    assert.deepStrictEqual(res, [{ num }])
  })

  it('getAsync should return awaitable results', async () => {
    const num = crypto.randomBytes(16).toString('hex')
    const res = await sqliteFac.getAsync('SELECT ? as num;', [num])
    assert.deepStrictEqual(res, { num })
  })

  it('execAsync should reutrn awaitable results', async () => {
    const res = sqliteFac.execAsync('SELECT 1;')
    assert.ok(res instanceof Promise)
  })
})
