/* eslint-env mocha */

'use strict'

const assert = require('assert')
const path = require('path')

const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const Fac = require('../')

const tmpDir = path.join(__dirname, 'tmp')

let fac
beforeEach((done) => {
  rimraf.sync(tmpDir)
  mkdirp.sync(tmpDir)

  Fac.ctx = { root: '' }

  fac = new Fac(Fac, {
    db: path.join(__dirname, 'tmp', 'test.db'),
    dirConf: path.join(__dirname, 'fixtures'),
    runSqlAtStart: [
      'CREATE TABLE IF NOT EXISTS Employees (id INTEGER PRIMARY KEY ASC, name, surname)'
    ]
  })

  fac._start(done)
})

afterEach((done) => {
  fac._stop(() => {
    rimraf.sync(tmpDir)
    done()
  })
})

describe('upsert', () => {
  it('builds nice queries', (done) => {
    const res = fac._buildUpsertQuery({
      table: 'Employees',
      pkey: 'id',
      pval: '1',
      data: { id: 1, name: 'peter', surname: 'bitcoin' }
    })

    const db = fac.db

    db.run(res.query, res.data, next)

    function next (err) {
      if (err) throw err
      db.get('SELECT * FROM Employees WHERE 1 = 1', (err, data) => {
        if (err) throw err
        assert.deepEqual(
          data,
          { id: 1, name: 'peter', surname: 'bitcoin' }
        )
        nextTest()
      })
    }
    function nextTest () {
      db.serialize(() => {
        db.run(
          res.query,
          { $id: 1, $surname: 'ardoino', $name: 'paolo' }
        )

        db.get('SELECT id, surname, name FROM Employees WHERE id = $id', { $id: 1 }, (err, data) => {
          if (err) throw err
          assert.deepEqual(
            data,
            { id: 1, name: 'paolo', surname: 'ardoino' }
          )
          done()
        })
      })
    }
  })

  it('upserts', (done) => {
    fac.upsert({
      table: 'Employees',
      pkey: 'id',
      pval: '1',
      data: { id: 1, name: 'paolo', surname: 'ardoino' }
    }, cb)

    function cb () {
      fac.db.get('SELECT id, surname, name FROM Employees WHERE id = $id', { $id: 1 }, (err, data) => {
        if (err) throw err
        assert.deepEqual(
          data,
          { id: 1, name: 'paolo', surname: 'ardoino' }
        )
        done()
      })
    }
  })

  it('upsert returns lastID', (done) => {
    fac.upsert({
      table: 'Employees',
      pkey: 'id',
      pval: null,
      data: { name: 'paolo', surname: 'ardoino' }
    }, cb)

    function cb (err, res) {
      if (err) throw err
      fac.db.get('SELECT id, surname, name FROM Employees WHERE id = $id', { $id: res.lastID }, (err, data) => {
        if (err) throw err
        assert.deepEqual(res, { lastID: 1 })
        assert.deepEqual(
          data,
          { id: res.lastID, name: 'paolo', surname: 'ardoino' }
        )
        done()
      })
    }
  })

  it('supports controlled upserts: cupsert', (done) => {
    fac.upsert({
      table: 'Employees',
      pkey: 'id',
      pval: '1',
      data: { id: 1, name: 'paolo', surname: 'ardoino' }
    }, next)

    function next () {
      fac.cupsert({
        table: 'Employees',
        pkey: 'id',
        pval: '1',
        process: (data, cb) => {
          data.surname = 'diaz'
          cb(null, data)
        }
      }, cb)

      function cb () {
        fac.db.get('SELECT id, surname, name FROM Employees WHERE id = $id', { $id: 1 }, (err, data) => {
          if (err) throw err
          assert.deepEqual(
            data,
            { id: 1, name: 'paolo', surname: 'diaz' }
          )
          done()
        })
      }
    }
  })
})
