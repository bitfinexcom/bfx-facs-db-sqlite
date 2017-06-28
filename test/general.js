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

describe('general', () => {
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
})
