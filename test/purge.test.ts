import { afterEach, beforeAll, expect, test } from 'bun:test';
import { caching, type Cache } from 'cache-manager';
import { BunSqliteStore } from '../src';
import type { BunSqliteStoreClass } from '../src/index';

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
  await Bun.sleep(ttlDefault + 2);
  expect(await cache.store._getExpired('foo')).toBe(undefined);
});

test('ttl custom (purge)', async () => {
  const ttl = 5;
  await cache.set('foo', 'bar', ttl);
  expect(await cache.get<string>('foo')).toBe('bar');
  await Bun.sleep(ttl + 2);
  expect(await cache.get('foo')).toBe(undefined);
});
