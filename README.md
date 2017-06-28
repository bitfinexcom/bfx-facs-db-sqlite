# bfx-facs-db-sqlite

## API


### fac.upsert

Example:

```
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

### Example

**db-sqlite.config.json**

```json
{
  "sqlite": {
    "name": "foo",
    "label": "bar",
    "runSqlAtStart": [
      "CREATE TABLE IF NOT EXISTS vegetables (id INTEGER PRIMARY KEY ASC, sold, price)",
      "CREATE TABLE IF NOT EXISTS meat (id INTEGER PRIMARY KEY ASC, sold, price)"
    ]
  }
}


```
git clone git@github.com:bitfinexcom/REPO.git REPO
git remote -v
git remote add upstream git@github.com:bitfinexcom/PARENT.git
git remote -v
git push origin master
```
