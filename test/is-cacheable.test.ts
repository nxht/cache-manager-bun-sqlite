import { afterEach, beforeAll, expect, test } from 'bun:test';
import { createCache, type Cache, type Store } from 'cache-manager';
import { BunSqliteStore } from '../src';

let cache: Cache<Store>;

afterEach(async () => await cache.reset());

beforeAll(() => {
  cache = createCache(
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
