# bfx-facs-db-sqlite

## API


### fac.upsert

Returns `{ lastID: <lastID> }` in the result

Example:

```js
fac.upsert({
  table: 'Employees',
  selectKey: 'id',
  selectValue: '1',
  data: { id: 1, name: 'paolo', surname: 'ardoino' }
}, cb)

// runs:
d.run(
  "INSERT OR REPLACE INTO Employees (id, name, surname) VALUES ((SELECT id FROM Employees WHERE id = $id),  $name,  $surname)",
  { '$id': '1', '$name': 'peter', '$surname': 'bitcoin' }
)
```

### fac.cupsert

Provides a simple way to check and process data before an upsert.

Example:

```js
fac.cupsert({
  table: 'Employees',
  selectKey: 'id',
  selectValue: '1',
  process: (data, cb) => {
    data[0].surname = 'diaz'
    cb(null, data[0])
  }
}, cb)
```

### fac.runMigrations
  - `migrations`: &lt;Array&gt;
    - `inex 0..x`: &lt;Function&gt;
  - `cb`: &lt;Function&gt;

Runs an array of functions (migrations).

  Each function in the migrations array is passed the faculty instance and a callback.

Assumptions:
 1.  `PRAGMA user_version` will be used to track migrations.  It is assumed to unused and will increment as an id for the index of the migrations array
 1.  New migrations will always be added to the end of the migrations array and old migrations shall never be deleted from the array.  The `PRAGMA user_version` will track which migrations in the migration array which have run and only run new migrations.
 1.  Each migration is automatically wrapped in a TRANSACTION.   Migrations will stop running on any error.

#### Example Migrations

```js
// api.my.wrk.js
  init () {
    super.init()

    this.setInitFacs([
      ['fac', 'bfx-facs-db-sqlite', 'main', 'main', {
        name: this.prefix,
        persist: true
      }]
    ])

  }

  _start (cb) {
    const migrations = [
      (dsm, cb) => {
        dsm.db.run('ALTER TABLE token_sales ADD COLUMN listed INTEGER;', cb)
      }
    ]

    async.series([
      next => { super._start(next) },
      next => { this.dbSqlite_main.runMigrations(migrations, next) }
    ], cb)
  }
```

## Config

### name

Used to construct the database name: sqlite_$NAME_$LABEL.db

### label

Used to construct the database name: sqlite_$NAME_$LABEL.db

### runSqlAtStart

Runs SQLite commands at start of the service.
Useful to create a table if it does not exist.
Takes an array commands to run.

**Example fields:**

```
{
  "runSqlAtStart": [
    'CREATE TABLE IF NOT EXISTS vegetables (id INTEGER PRIMARY KEY ASC, sold, price)',
    'CREATE TABLE IF NOT EXISTS meat (id INTEGER PRIMARY KEY ASC, sold, price)'
  ]
}
```
