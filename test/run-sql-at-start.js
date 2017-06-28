/* eslint-env mocha */

'use strict'

const assert = require('assert')
const path = require('path')

const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const Fac = require('../')

const tmpDir = path.join(__dirname, 'tmp')

beforeEach(() => {
  rimraf.sync(tmpDir)
  mkdirp.sync(tmpDir)
})

afterEach(() => {
  rimraf.sync(tmpDir)
})

describe('table option', () => {
  it('creates tables if they do not exist', (done) => {
    const fac = new Fac(Fac, {
      db: path.join(__dirname, 'tmp', 'test2.db'),
      dirConf: path.join(__dirname, 'fixtures'),
      runSqlAtStart: [
        'CREATE TABLE IF NOT EXISTS fruits (id INTEGER PRIMARY KEY ASC, sold, price)',
        'CREATE TABLE IF NOT EXISTS shops (id INTEGER PRIMARY KEY ASC, location)'
      ]
    })
    fac._start(next)

    function next () {
      fac.db.serialize(() => {
        fac.db.all("select name from sqlite_master where type='table'", (err, tables) => {
          if (err) throw err
          assert.deepEqual(
            tables,
            [ { name: 'fruits' }, { name: 'shops' } ]
          )
          fac.db.close()
          done()
        })
      })
    }
  })
})
