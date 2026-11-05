'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')

const { facCaller } = require('./helper')

const Fac = require('..')

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
  }]

const badMigrations = [
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN title STRING', cb)
  },
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Personael ADD COLUMN gender STRING', cb)
  },
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN age INTEGER', cb)
  }]

const badMigrationsWithException = [
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN title STRING', cb)
  },
  (dsm, cb) => {
    throw new Error('I am not expected')
  },
  (dsm, cb) => {
    dsm.db.run('ALTER TABLE Employees ADD COLUMN age INTEGER', cb)
  }]

const column = (cid, name, type, pk = 0) => ({ cid, name, type, notnull: 0, dflt_value: null, pk })

const COL_ID = column(0, 'id', 'INTEGER', 1)
const COL_NAME = column(1, 'name', '')
const COL_SURNAME = column(2, 'surname', '')
const COL_TITLE = column(3, 'title', 'STRING')
const COL_GENDER = column(4, 'gender', 'STRING')
const COL_AGE = column(5, 'age', 'INTEGER')

function call (fn) {
  return new Promise((resolve, reject) => fn((err, res) => err ? reject(err) : resolve(res)))
}

function callRaw (fn) {
  return new Promise((resolve) => fn((err, res) => resolve({ err, res })))
}

async function setupTest (t) {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  fs.mkdirSync(tmpDir, { recursive: true })

  Fac.ctx = { root: '' }

  const fac = new Fac(facCaller, {
    db: path.join(tmpDir, 'test.db'),
    dirConf: path.join(__dirname, 'fixtures'),
    runSqlAtStart: [
      'CREATE TABLE IF NOT EXISTS Employees (id INTEGER PRIMARY KEY ASC, name, surname)'
    ]
  })

  await call((cb) => fac._start(cb))

  t.teardown(async () => {
    await new Promise((resolve) => fac._stop(() => resolve()))
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  return fac
}

test('migrate', async (t) => {
  await t.test('runs an array of functions', async (t) => {
    const fac = await setupTest(t)

    await call((cb) => fac.runMigrations(migrations, cb))

    const columns = await call((cb) => fac.db.all('PRAGMA table_info(Employees)', cb))
    t.alike(columns, [COL_ID, COL_NAME, COL_SURNAME, COL_TITLE, COL_GENDER, COL_AGE])

    // function next (err) {
    //   if (err) throw err
    //   db.all('PRAGMA table_info(Employees)', (err, data) => {
    //     if (err) throw err
    //     assert.deepStrictEqual(
    //       data,
    //       [{
    //         cid: 0,
    //         name: 'id',
    //         type: 'INTEGER',
    //         notnull: 0,
    //         dflt_value: null,
    //         pk: 1
    //       },
    //       {
    //         cid: 1,
    //         name: 'name',
    //         type: '',
    //         notnull: 0,
    //         dflt_value: null,
    //         pk: 0
    //       },
    //       {
    //         cid: 2,
    //         name: 'surname',
    //         type: '',
    //         notnull: 0,
    //         dflt_value: null,
    //         pk: 0
    //       },
    //       {
    //         cid: 3,
    //         name: 'title',
    //         type: 'STRING',
    //         notnull: 0,
    //         dflt_value: null,
    //         pk: 0
    //       },
    //       {
    //         cid: 4,
    //         name: 'gender',
    //         type: 'STRING',
    //         notnull: 0,
    //         dflt_value: null,
    //         pk: 0
    //       },
    //       {
    //         cid: 5,
    //         name: 'age',
    //         type: 'INTEGER',
    //         notnull: 0,
    //         dflt_value: null,
    //         pk: 0
    //       }])
    //     nextTest()
    //   })
    // }
    // function nextTest () {
    //   done()
    // }
  })

  await t.test('increments user_version', async (t) => {
    const fac = await setupTest(t)

    const before = await call((cb) => fac.db.get('PRAGMA user_version', cb))
    t.alike(before, { user_version: 0 })

    await call((cb) => fac.runMigrations(migrations, cb))

    const after = await call((cb) => fac.db.get('PRAGMA user_version', cb))
    t.alike(after, { user_version: 3 })
  })

  await t.test('stops migrations on an error', async (t) => {
    const fac = await setupTest(t)

    const { err } = await callRaw((cb) => fac.runMigrations(badMigrations, cb))
    t.is(err?.message, 'SQLITE_ERROR: no such table: Personael')

    const columns = await call((cb) => fac.db.all('PRAGMA table_info(Employees)', cb))
    t.alike(columns, [COL_ID, COL_NAME, COL_SURNAME, COL_TITLE])
  })

  await t.test('increments user_version up to highest succesfull migrations only', async (t) => {
    const fac = await setupTest(t)

    const before = await call((cb) => fac.db.get('PRAGMA user_version', cb))
    t.alike(before, { user_version: 0 })

    const { err } = await callRaw((cb) => fac.runMigrations(badMigrations, cb))
    t.is(err?.message, 'SQLITE_ERROR: no such table: Personael')

    const after = await call((cb) => fac.db.get('PRAGMA user_version', cb))
    t.alike(after, { user_version: 1 })
  })

  await t.test('gracefully handles unexpected exceptions', async (t) => {
    const fac = await setupTest(t)

    const before = await call((cb) => fac.db.get('PRAGMA user_version', cb))
    t.alike(before, { user_version: 0 })

    const { err } = await callRaw((cb) => fac.runMigrations(badMigrationsWithException, cb))
    t.is(err?.message, 'I am not expected')

    const after = await call((cb) => fac.db.get('PRAGMA user_version', cb))
    t.alike(after, { user_version: 1 })
  })
})
