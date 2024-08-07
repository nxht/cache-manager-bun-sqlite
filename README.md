# Node Cache Manager store for Bun SQLite

[bun:sqlite](https://bun.sh/docs/api/sqlite) store for the [node-cache-manager](https://github.com/BryanDonovan/node-cache-manager)


## Installation 

```sh
bun install cache-manager-bun-sqlite
```

## Usage Examples

```typescript
import { caching } from 'cache-manager';
import { BunSqliteStore } from 'cache-manager-bun-sqlite';

const cache = caching(
  BunSqliteStore({
    name: 'test',
    path: ':memory:',
    ttl: 10, // in ms,
    purgeInterval: 5 * 60 * 1000, // in ms
  }),
);

await cache.set('foo', 'bar');
console.log(await cache.get('foo')); // 'bar'
```