import { afterEach, beforeAll, expect, test } from 'bun:test';
import { createCache, type Cache, type Store } from 'cache-manager';
import { BunSqliteStore } from '../src';

let cache: Cache<Store>;

const ttlDefault = 10;

beforeAll(() => {
  cache = createCache(
    BunSqliteStore({
      name: 'test',
      path: ':memory:',
      ttl: ttlDefault,
    }),
  );
});
afterEach(async () => await cache.reset());

test('ttl default', async () => {
  await cache.set('foo', 'bar');
  expect(await cache.get<string>('foo')).toBe('bar');
  await Bun.sleep(ttlDefault);
  expect(await cache.get('foo')).toBe(undefined);
});

test('ttl custom', async () => {
  const ttl = 5;
  await cache.set('foo', 'bar', ttl);
  expect(await cache.get<string>('foo')).toBe('bar');
  await Bun.sleep(ttl);
  expect(await cache.get('foo')).toBe(undefined);
});
