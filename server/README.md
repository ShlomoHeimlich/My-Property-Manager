# Server data storage

The API stores users, properties, and transactions in `data/store.json` by default. This file contains private user and property data, including password hashes; it is excluded from Git.

For deployment, set `JSON_STORE_PATH` to a location on a persistent disk attached to the API server. Run one server instance against that file. A local JSON file is not shared across instances and can be lost when a hosting platform replaces an ephemeral filesystem.

To preserve existing PostgreSQL data, set `DATABASE_URL` in the server environment and run this once from the `server` directory before removing that variable:

```powershell
npm run export:postgres-to-json
```

The exporter merges records into the JSON store without replacing existing JSON records. It reports how many users, properties, and transactions it added. Keep a backup of the resulting JSON file. The normal API server does not connect to PostgreSQL.
