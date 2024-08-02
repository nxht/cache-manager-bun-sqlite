import { afterEach, beforeAll, expect, test } from 'bun:test';
import { caching, type Cache } from 'cache-manager';
import { BunSqliteStore, type BunSqliteStoreClass } from '../src';

let cache: Cache<BunSqliteStoreClass>;

const ttlDefault = 10;

beforeAll(async () => {
  cache = await caching(
    BunSqliteStore({
      name: 'test',
      path: ':memory:',
      ttl: ttlDefault,
      purgeInterval: 1,
    }),
  );
});
afterEach(async () => await cache.reset());

test('ttl default (purge)', async () => {
  await cache.set('foo', 'bar');
  expect(await cache.get<string>('foo')).toBe('bar');
  await Bun.sleep(ttlDefault + 3);
  const row = await cache.store._getRow('foo');
  expect(row).toBeNull();
});

test('ttl custom (purge)', async () => {
  const ttl = 5;
  await cache.set('foo', 'bar', ttl);
  expect(await cache.get<string>('foo')).toBe('bar');
  await Bun.sleep(ttl + 3);
  const row = await cache.store._getRow('foo');
  expect(row).toBeNull();
});
