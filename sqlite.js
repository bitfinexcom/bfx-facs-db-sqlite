'use strict'

const async = require('async')
const SqliteDb = require('sqlite3')
const Facility = require('./base')
const _ = require('lodash')

class Sqlite extends Facility {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'db-sqlite'
    this._hasConf = false

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
    const { table, pkey, pval, process } = opts
    
    const d = {}
    d[`$${pkey}`] = `${pval}`

    this.db.get(
      `SELECT * from ${table} WHERE ${pkey} = $${pkey}`,
      d,
      (err, res) => {
        if (err) return cb(err)
   
        process(res, (err, data) => {
          if (err) return cb(err)
          this.upsert({ table, pkey, pval, data }, cb)
        })
      })
  }

  _buildUpsertQuery ({ table, pkey, pval, data }) {
    if (!table || !pkey || !pval || !data) {
      console.error(
        '_buildUpsertQuery missing argument:',
        `${table}, ${pkey}, ${pval}, ${data}`
      )
      console.trace()
    }

    data[pkey] = pval

    const fields = _.keys(data)
    
    const placeholders = _.map(fields, k => {
      if (!_.isUndefined(data[k])) {
        return `$${k}`
      } else {
        return `(SELECT ${k} FROM ${table} WHERE ${pkey} = $${pkey})`
      }
    })

    const values = {}

    _.each(fields, k => {
      values[`$${k}`] = data[k]
    })

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
