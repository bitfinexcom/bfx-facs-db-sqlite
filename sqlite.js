'use strict'

const async = require('async')
const SqliteDb = require('sqlite3')
const Facility = require('./base')
const path = require('path')
const fs = require('fs')

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
        const db = `${__dirname}/../../db/${this.name}_${this.opts.name}_${this.opts.label}.db`
        const dbDir = path.dirname(db)

        if (!fs.existsSync(dbDir)) {
          throw new Error(`directory ${dbDir} does not exist`)
        }

        this.db = new SqliteDb.Database(
          db,
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
