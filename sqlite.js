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

  upsert (data, cb) {
    const res = this._buildUpsertQuery(data)
    this.db.run(res.query, res.data, cb)
  }

  cupsert (opts, cb) {
    const { table, selectKey, selectValue, process } = opts
    const d = {}
    d[`$${selectKey}`] = `${selectValue}`

    this.db.all(
      `SELECT * from ${table} WHERE ${selectKey} = $${selectKey}`,
      d,
      (err, res) => {
        if (err) return cb(err)
        process(res, (err, data) => {
          if (err) return cb(err)
          this.upsert({ table, selectKey, selectValue, data }, cb)
        })
      })
  }

  _buildUpsertQuery ({ table, selectKey, selectValue, data }) {
    if (!table || !selectKey || !selectValue || !data) {
      console.error(
        '_buildUpsertQuery missing argument:',
        `${table}, ${selectKey}, ${selectValue}, ${data}`
      )
      console.trace()
    }

    const fields = Object.keys(data)
    const placeholders = fields.map((el, i) => {
      if (el === selectKey) {
        return `(SELECT ${el} FROM ${table} WHERE ${selectKey} = $${selectKey})`
      }

      return ' ' + `$${el}`
    })

    const values = {}
    fields.forEach((el) => {
      values[`$${el}`] = data[el]
    })

    values[`$${selectKey}`] = selectValue

    return {
      query: `INSERT OR REPLACE INTO ${table} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
      data: values
    }
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
