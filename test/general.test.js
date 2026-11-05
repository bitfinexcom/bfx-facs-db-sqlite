'use strict'

const test = require('brittle')
const path = require('path')

const { facCaller } = require('./helper')

const Fac = require('..')

function call (fn) {
  return new Promise((resolve) => fn((err, res) => resolve({ err, res })))
}

test('general', async (t) => {
  await t.test('returns an error if db directory does not exist', async (t) => {
    const fac = new Fac(facCaller, {
      db: path.join(__dirname, 'foo', 'funky', 'bar.db'),
      dirConf: path.join(__dirname, 'fixtures')
    })

    const { err } = await call((cb) => fac._start(cb))
    t.ok(err instanceof Error, 'start fails when the db directory is missing')

    const stop = await call((cb) => fac._stop(cb))
    t.absent(stop.err, 'stop succeeds')
  })
})
