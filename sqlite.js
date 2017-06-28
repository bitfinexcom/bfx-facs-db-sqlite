'use strict'

const async = require('async')
const SqliteDb = require('sqlite3')
const Facility = require('./base')
const _ = require('lodash')

class Sqlite extends Facility {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'db-sqlite'
    this._hasConf = true

    this.opts = _.defaults({}, opts, this.opts, {
      db: `${__dirname}/../../db/${this.name}_${this.opts.name}_${this.opts.label}.db`
    })

    this.init()
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      next => {
        const db = this.opts.db

        this.db = new SqliteDb.Database(
          db,
          next
        )
      },
      next => {
        this._maybeRunSqlAtStart(next)
      }
    ], cb)
  }

  _maybeRunSqlAtStart (cb) {
    if (!this.opts.runSqlAtStart) return cb(null)

    const callLast = (() => {
      let called = 0
      return (limit, cb) => {
        called++
        if (called === limit) {
          cb(null)
        }
      }
    })()

    this.db.serialize(() => {
      this.opts.runSqlAtStart.forEach((q) => {
        this.db.run(q, (err) => {
          if (err) throw err

          callLast(this.opts.runSqlAtStart.length, cb)
        })
      })
    })
  }

  _stop (cb) {
    async.series([
      next => { super._stop(next) },
      next => {
        try {
          this.db.close()
        } catch (e) {
          console.error(e)
        }
        delete this.db
        next()
      }
    ], cb)
  }
}

module.exports = Sqlite
