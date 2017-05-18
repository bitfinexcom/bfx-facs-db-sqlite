'use strict'

const async = require('async')
const Sqlite = require('sqlite3')
const Facility = require('./base/base')

class Sqlite extends Facility {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'sqlite'

    this.init()
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      next => {
        this.db = new Sqlite.Database(
          `${__dirname}/../../db/${this.name}_${this.opts.name}_${this.opts.label}`,
          next
        )
      }
    ], cb)
  }

  _stop (cb) {
    async.series([
      next => { super._stop(next) },
      next => {
        try {
          this.db.close()
        } catch(e) {
          console.error(err)
        }
        delete this.db
        next()
      }
    ], cb)
  }
}

module.exports = Sqlite
