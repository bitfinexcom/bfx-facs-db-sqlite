'use strict'

const _ = require('lodash')
const path = require('path')
const fs = require('fs')
const async = require('async')
const SqliteDb = require('sqlite3')
const Base = require('bfx-facs-base')

class Sqlite extends Base {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'db-sqlite'
    this._hasConf = false

    const cal = this.caller

    const {
      dbFolder,
      label
    } = this.opts
    const baseName = `${this.name}_${this.opts.name}_${label}.db`
    const db = path.isAbsolute(dbFolder)
      ? path.join(dbFolder, baseName)
      : path.join(cal.ctx.root, 'db', baseName)
    this.opts = _.defaults({}, opts, this.opts, { db })

    this._migrate = this._migrate.bind(this)
    this.runMigrations = this.runMigrations.bind(this)

    this.init()
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      next => {
        const db = this.opts.db
        const dbDir = path.dirname(db)

        fs.access(dbDir, fs.constants.W_OK, (err) => {
          if (err && err.code === 'ENOENT') {
            const msg = `the directory ${dbDir} does not exist, please create`
            return next(new Error(msg))
          } else if (err) {
            return cb(err)
          }

          this.db = new SqliteDb.Database(
            db,
            next
          )
        })
      },
      next => {
        this.db.configure('busyTimeout', this.opts.busyTimeout || 1000)
        this.db.on('error', err => {
          console.error('ERR_DB_SQLITE', err)
        })
        this._maybeRunSqlAtStart(next)
      }
    ], cb)
  }

  upsert (data, cb) {
    const res = this._buildUpsertQuery(data)
    this.db.run(res.query, res.data, function (err) {
      if (err) return cb(err)
      cb(null, { lastID: this.lastID })
    })
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
    if (!table || !pkey || !data) {
      console.error(
        '_buildUpsertQuery missing argument:',
        `${table}, ${pkey}, ${data}`
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

  runMigrations (migrations, cb) {
    this._migrationIndex = 0

    async.mapSeries(migrations, this._migrate, (err, results) => {
      if (err) {
        console.error(err)
        return cb(err, results)
      }
      cb(null, results)
    })
  }

  _migrate (migration, cb) {
    let inTransaction = true
    this._migrationIndex += 1

    async.waterfall([
      (next) => {
        this.db.all('PRAGMA user_version', [], (err, rows) => {
          if (err) {
            next(err)
          } else {
            const userVersion = rows[0].user_version
            if (this._migrationIndex <= userVersion) { return cb(null) }
            next(null, userVersion)
          }
        })
      },
      (userVersion, next) => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (!err) { inTransaction = true }
          next(err, userVersion)
        })
      },
      (userVersion, next) => {
        console.log('running migration', userVersion)
        try {
          migration(this, (err) => {
            next(err, userVersion)
          })
        } catch (e) {
          next(e)
        }
      },
      (userVersion, next) => {
        this.db.run(`PRAGMA user_version=${userVersion + 1}`, next)
      },
      (next) => {
        this.db.run('COMMIT', next)
      }
    ], (err, data) => {
      if (!err) return cb(null, data)

      if (err && inTransaction) {
        this.db.run('ROLLBACK', (commitErr) => {
          if (commitErr) { console.log('Error on rollback', commitErr) }
          cb(err)
        })
        return
      }
      cb(err)
    })
  }
}

module.exports = Sqlite
