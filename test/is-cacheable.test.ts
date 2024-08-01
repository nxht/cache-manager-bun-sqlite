import { afterEach, beforeAll, expect, test } from 'bun:test';
import { caching, type Cache } from 'cache-manager';
import { BunSqliteStore, type BunSqliteStoreClass } from '../src';

let cache: Cache<BunSqliteStoreClass>;

afterEach(async () => await cache.reset());

beforeAll(async () => {
  cache = await caching(
    BunSqliteStore({
      name: 'test2',
      path: ':memory:',
      isCacheable: (value: unknown) => typeof value === 'number',
    }),
  );
});

test('set success', async () => {
  await cache.set('foo', 1);
  expect(await cache.get<number>('foo')).toBe(1);
});

test('set error', async () => {
  expect(cache.set('foo', 'bar')).rejects.toStrictEqual(
    new Error(`no cacheable value "bar"`),
  );
});
