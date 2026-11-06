'use strict'

const test = require('brittle')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

const { facCaller } = require('./helper')
const Fac = require('..')

const tmpDir = path.join(__dirname, 'tmp')

const randomId = () => crypto.randomInt(1, 2 ** 31)
const randomName = () => crypto.randomBytes(6).toString('hex')

function call (fn) {
  return new Promise((resolve, reject) => fn((err, res) => err ? reject(err) : resolve(res)))
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

  t.teardown(async (t) => {
    await new Promise((resolve) => fac._stop(() => resolve()))
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  return fac
}

test('queries', async (t) => {
  await t.test('async queries', async (t) => {
    async function setupAsyncTest (t) {
      const fac = await setupTest(t)
      await call((cb) => fac.db.exec('DELETE FROM Employees where 1', cb))
      return fac
    }

    await t.test('runAsync should return an awaitable results', async (t) => {
      const fac = await setupAsyncTest(t)
      const params = [randomId(), randomName(), randomName()]
      const res = await fac.runAsync('INSERT into Employees(id,name, surname) VALUES(?, ?, ?);', params)
      t.is(res.lastID, params[0])
    })

    await t.test('allAsync should return an awaitable results', async (t) => {
      const fac = await setupAsyncTest(t)
      const params = [randomId(), randomName(), randomName()]
      await fac.runAsync('INSERT into Employees(id,name, surname) VALUES(?, ?, ?);', params)
      const res = await fac.allAsync('SELECT * from Employees;')
      t.alike(res, [{ id: params[0], name: params[1], surname: params[2] }])
    })

    await t.test('allAsync should work when no prams is passed', async (t) => {
      const fac = await setupAsyncTest(t)
      const id = randomId()
      const name = randomName()
      const surname = randomName()
      await fac.runAsync(`INSERT into Employees(id,name, surname) VALUES(${id}, '${name}', '${surname}');`)
      const res = await fac.allAsync('SELECT * from Employees;')
      t.alike(res, [{ id, name, surname }])
    })

    await t.test('getAsync should return awaitable results', async (t) => {
      const fac = await setupAsyncTest(t)
      const params = [randomId(), randomName(), randomName()]
      await fac.runAsync('INSERT into Employees(id,name, surname) VALUES(?, ?, ?);', params)
      await fac.runAsync('INSERT into Employees(name, surname) VALUES( ?, ?);', params.slice(1))
      const res = await fac.getAsync('SELECT * from Employees WHERE id=?', [params[0]])
      t.alike(res, { id: params[0], name: params[1], surname: params[2] })
    })

    await t.test('getAsync should handle no params', async (t) => {
      const fac = await setupAsyncTest(t)
      const params = [randomId(), randomName(), randomName()]
      await fac.runAsync('INSERT into Employees(id,name, surname) VALUES(?, ?, ?);', params)
      const res = await fac.getAsync('SELECT * from Employees;')
      t.alike(res, { id: params[0], name: params[1], surname: params[2] })
    })

    await t.test('execAsync should reutrn awaitable results', async (t) => {
      const fac = await setupAsyncTest(t)
      const params = [randomId(), randomName(), randomName()]
      await fac.runAsync('INSERT into Employees(id,name, surname) VALUES(?, ?, ?);', params)
      await fac.execAsync('DELETE FROM Employees WHERE 1')
      const res = await fac.getAsync('Select * FROM Employees')
      t.ok(!res)
    })

    await t.test('upsertAsync should return awaitable results', async (t) => {
      const fac = await setupAsyncTest(t)
      const opts = {
        table: 'Employees',
        pkey: 'id',
        pval: crypto.randomInt(0, 2),
        data: {
          name: crypto.randomBytes(16).toString('hex'),
          surname: crypto.randomBytes(16).toString('hex')
        }
      }
      await fac.upsertAsync(opts)
      const employee = await fac.getAsync('SELECT * FROM Employees where id=?', [opts.pval])
      t.alike(employee, { id: opts.pval, ...opts.data })
    })

    await t.test('cupsertAsync should return awaitable results', async (t) => {
      const fac = await setupAsyncTest(t)
      const opts = {
        table: 'Employees',
        pkey: 'id',
        pval: crypto.randomInt(0, 2),
        data: {
          name: crypto.randomBytes(16).toString('hex'),
          surname: crypto.randomBytes(16).toString('hex')
        },
        process: async (d) => {
          return Promise.resolve(d)
        }
      }
      await fac.runAsync('INSERT INTO Employees(id, name, surname) VALUES(?, ?, ?)', [opts.pval, opts.data.name, opts.data.surname])
      await fac.cupsertAsync(opts)
      const employee = await fac.getAsync('SELECT * FROM Employees where id=?', [opts.pval])
      t.alike(employee, { id: opts.pval, ...opts.data })
    })
  })
  await t.test('upsert', async (t) => {
    await t.test('builds nice queries', async (t) => {
      const fac = await setupTest(t)
      const db = fac.db

      const res = fac._buildUpsertQuery({
        table: 'Employees',
        pkey: 'id',
        pval: '1',
        data: { id: 1, name: 'peter', surname: 'bitcoin' }
      })

      await call((cb) => db.run(res.query, res.data, cb))

      const first = await call((cb) => db.get('SELECT * FROM Employees WHERE 1 = 1', cb))
      t.alike(first, { id: 1, name: 'peter', surname: 'bitcoin' })

      const second = await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run(res.query, { $id: 1, $surname: 'ardoino', $name: 'paolo' })
          db.get(
            'SELECT id, surname, name FROM Employees WHERE id = $id',
            { $id: 1 },
            (err, data) => err ? reject(err) : resolve(data)
          )
        })
      })
      t.alike(second, { id: 1, name: 'paolo', surname: 'ardoino' })
    })

    await t.test('upserts', async (t) => {
      const fac = await setupTest(t)

      await call((cb) => fac.upsert({
        table: 'Employees',
        pkey: 'id',
        pval: '1',
        data: { id: 1, name: 'paolo', surname: 'ardoino' }
      }, cb))

      const data = await call((cb) => fac.db.get(
        'SELECT id, surname, name FROM Employees WHERE id = $id', { $id: 1 }, cb
      ))
      t.alike(data, { id: 1, name: 'paolo', surname: 'ardoino' })
    })

    await t.test('upsert returns lastID', async (t) => {
      const fac = await setupTest(t)

      const res = await call((cb) => fac.upsert({
        table: 'Employees',
        pkey: 'id',
        pval: null,
        data: { name: 'paolo', surname: 'ardoino' }
      }, cb))

      const data = await call((cb) => fac.db.get(
        'SELECT id, surname, name FROM Employees WHERE id = $id', { $id: res.lastID }, cb
      ))
      t.alike(res, { lastID: 1 })
      t.alike(data, { id: res.lastID, name: 'paolo', surname: 'ardoino' })
    })

    await t.test('supports controlled upserts: cupsert', async (t) => {
      const fac = await setupTest(t)

      await call((cb) => fac.upsert({
        table: 'Employees',
        pkey: 'id',
        pval: '1',
        data: { id: 1, name: 'paolo', surname: 'ardoino' }
      }, cb))

      await call((cb) => fac.cupsert({
        table: 'Employees',
        pkey: 'id',
        pval: '1',
        process: (data, next) => {
          data.surname = 'diaz'
          next(null, data)
        }
      }, cb))

      const data = await call((cb) => fac.db.get(
        'SELECT id, surname, name FROM Employees WHERE id = $id', { $id: 1 }, cb
      ))
      t.alike(data, { id: 1, name: 'paolo', surname: 'diaz' })
    })
  })
})
