/* eslint-env mocha */

'use strict'

const assert = require('assert')
const path = require('path')
const _ = require('lodash')

const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const fs = require('fs')

const Fac = require('../')
const crypto = require('crypto')

const tmpDir = path.join(__dirname, 'tmp')
describe.only('general', () => {
  let sqliteFac = null
  before(function(done){
    // rimraf.sync(tmpDir)
    mkdirp.sync(tmpDir)
      Fac.ctx = { root: '' }
      sqliteFac =  new Fac(Fac, {
        db: path.join(__dirname, 'tmp', 'test.db'),

       label: 'test',
       dirConf: path.join(__dirname, 'fixtures'),
       runSqlAtStart: [
         'CREATE TABLE IF NOT EXISTS Employees (id INTEGER PRIMARY KEY ASC, name, surname)'
       ]
     })
    sqliteFac._start(done)
  })

  beforeEach(async ()=>{
    sqliteFac.db.run(`DELETE FROM Employees WHERE 1;`)
  })

  after(function (){
    sqliteFac._stop()
    rimraf.sync(tmpDir)
  })

  it('returns an error if db directory does not exist', (done) => {
    const fac = new Fac(Fac, {
      db: path.join(__dirname, 'foo', 'funky', 'bar.db'),
      dirConf: path.join(__dirname, 'fixtures')
    })
    fac._start(next)

    function next (err) {
      assert.ok(err instanceof Error)
      fac._stop(done)
    }
  })

  it('runAsync should return an awaitable results', async()=>{
      const res = sqliteFac.runAsync('SELECT 1;')
    assert.ok(res instanceof Promise)
  })

  it('allAsync should return an awaitable results', async ()=>{
    const num = crypto.randomBytes(16).toString('hex')
    const res = await sqliteFac.allAsync('SELECT ? as num;', [num])
    assert.deepStrictEqual(res, [{num}])
  })

  it('allAsync should return an awaitable results', async ()=>{
    const num = crypto.randomBytes(16).toString('hex')
    const res = await sqliteFac.allAsync('SELECT ? as num;', [num])
    assert.deepStrictEqual(res, [{num}])
  })

  it('getAsync should return awaitable results', async()=>{
    const num = crypto.randomBytes(16).toString('hex')
    const res = await sqliteFac.getAsync('SELECT ? as num;', [num])
    assert.deepStrictEqual(res, {num})
  })

  it.only('upsert should return awaitable results if no callback is supplied', async()=>{
    const opts = {
      table: 'Employees',
      pkey: 'id',
      pval: _.random(1, false ),
      data: {
        name: crypto.randomBytes(16).toString('hex'),
        surname: crypto.randomBytes(16).toString('hex')
      }
    }
    await sqliteFac.upsert(opts)
    const employee = await sqliteFac.getAsync('SELECT * FROM Employees where id=?', [opts.pval])
    assert.deepStrictEqual(employee, {id: opts.pval, ...opts.data})
  })
})
