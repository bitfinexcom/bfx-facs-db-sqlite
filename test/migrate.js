/* eslint-env mocha */

'use strict'

const assert = require('assert')
const path = require('path')

const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const Fac = require('../')

const tmpDir = path.join(__dirname, 'tmp')

const migrations = [
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN title STRING', cb)
  },
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN gender STRING', cb)
  },
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN age INTEGER', cb)
  } ]

const badMigrations = [
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN title STRING', cb)
  },
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Personael ADD COLUMN gender STRING', cb)
  },
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN age INTEGER', cb)
  } ]

const badMigrationsWithException = [
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN title STRING', cb)
  },
  (dsm, cb) => {
    throw new Error('I am not expected')
  },
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN age INTEGER', cb)
  } ]

let fac
describe('migrate', () => {
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

  it('runs an array of functions', (done) => {
    fac.runMigrations(migrations, next)
    const db = fac.db

    function next (err) {
      if (err) throw err
      db.all('PRAGMA table_info(Employees)', (err, data) => {
        if (err) throw err
        assert.deepStrictEqual(
          data,
          [ { cid: 0,
            name: 'id',
            type: 'INTEGER',
            notnull: 0,
            dflt_value: null,
            pk: 1 },
          { cid: 1,
            name: 'name',
            type: '',
            notnull: 0,
            dflt_value: null,
            pk: 0 },
          { cid: 2,
            name: 'surname',
            type: '',
            notnull: 0,
            dflt_value: null,
            pk: 0 },
          { cid: 3,
            name: 'title',
            type: 'STRING',
            notnull: 0,
            dflt_value: null,
            pk: 0 },
          { cid: 4,
            name: 'gender',
            type: 'STRING',
            notnull: 0,
            dflt_value: null,
            pk: 0 },
          { cid: 5,
            name: 'age',
            type: 'INTEGER',
            notnull: 0,
            dflt_value: null,
            pk: 0 } ])
        nextTest()
      })
    }
    function nextTest () {
      done()
    }
  })

  it('increments user_version', (done) => {
    const db = fac.db

    db.get('PRAGMA user_version', (err, data) => {
      if (err) throw err
      assert.deepStrictEqual(data, { user_version: 0 })
      next()
    })

    function next () {
      fac.runMigrations(migrations, nextTest)
    }

    function nextTest (err) {
      if (err) throw err
      db.get('PRAGMA user_version', (err, data) => {
        if (err) throw err
        assert.deepStrictEqual(data, { user_version: 3 })
        done()
      })
    }
  })

  it('stops migrations on an error', (done) => {
    fac.runMigrations(badMigrations, next)
    const db = fac.db

    function next (err) {
      assert.strictEqual(err.message, 'SQLITE_ERROR: no such table: Personael')
      db.all('PRAGMA table_info(Employees)', (err, data) => {
        if (err) throw err
        assert.deepStrictEqual(
          data,
          [ { cid: 0,
            name: 'id',
            type: 'INTEGER',
            notnull: 0,
            dflt_value: null,
            pk: 1 },
          { cid: 1,
            name: 'name',
            type: '',
            notnull: 0,
            dflt_value: null,
            pk: 0 },
          { cid: 2,
            name: 'surname',
            type: '',
            notnull: 0,
            dflt_value: null,
            pk: 0 },
          { cid: 3,
            name: 'title',
            type: 'STRING',
            notnull: 0,
            dflt_value: null,
            pk: 0 } ])
        nextTest()
      })
    }
    function nextTest () {
      done()
    }
  })

  it('increments user_version up to highest succesfull migrations only', (done) => {
    const db = fac.db

    db.get('PRAGMA user_version', (err, data) => {
      if (err) throw err
      assert.deepStrictEqual(data, { user_version: 0 })
      next()
    })

    function next () {
      fac.runMigrations(badMigrations, nextTest)
    }

    function nextTest (err) {
      assert.strictEqual(err.message, 'SQLITE_ERROR: no such table: Personael')
      db.get('PRAGMA user_version', (err, data) => {
        if (err) throw err
        assert.deepStrictEqual(data, { user_version: 1 })
        done()
      })
    }
  })

  it('gracefully handles unexpected exceptions', (done) => {
    const db = fac.db

    db.get('PRAGMA user_version', (err, data) => {
      if (err) throw err
      assert.deepStrictEqual(data, { user_version: 0 })
      next()
    })

    function next () {
      fac.runMigrations(badMigrationsWithException, nextTest)
    }

    function nextTest (err) {
      assert.strictEqual(err.message, 'I am not expected')
      db.get('PRAGMA user_version', (err, data) => {
        if (err) throw err
        assert.deepStrictEqual(data, { user_version: 1 })
        done()
      })
    }
  })
})
