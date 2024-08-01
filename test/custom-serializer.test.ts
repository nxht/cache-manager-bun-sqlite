import { deserialize, serialize } from 'bun:jsc';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test';
import { caching, type Cache } from 'cache-manager';
import { BunSqliteStore, type BunSqliteStoreClass } from '../src';

let cache: Cache<BunSqliteStoreClass>;

beforeAll(async () => {
  cache = await caching(
    BunSqliteStore({
      name: 'test',
      path: ':memory:',
      serializer: (value: unknown) =>
        Buffer.from(serialize(value)).toString('base64'),
      deserializer: <T>(value: string) =>
        deserialize(Buffer.from(value, 'base64')) as T,
    }),
  );
});

const key = 'foo';
const value = 'bar';

afterEach(async () => await cache.reset());

describe('get() and set()', () => {
  test('lets us set and get data in cache', async () => {
    await cache.set(key, value);
    expect(cache.get<string>(key)).resolves.toBe(value);

    await cache.del(key);
    expect(cache.get(key)).resolves.toBe(undefined);
  });

  test('should error no isCacheable value', async () => {
    expect(cache.set(key, undefined)).rejects.toStrictEqual(
      new Error('no cacheable value undefined'),
    );
  });

  test('should error no isCacheable value', async () => {
    expect(cache.store.mset([[key, undefined]])).rejects.toStrictEqual(
      new Error('no cacheable value undefined'),
    );
  });
});

describe('mget() and mset()', () => {
  test('lets us set and get several keys and data in cache', async () => {
    await cache.store.mset([
      ['foo1', 'bar1'],
      ['foo2', 'bar2'],
    ]);
    expect(cache.store.mget('foo1', 'foo2')).resolves.toStrictEqual([
      'bar1',
      'bar2',
    ]);
  });
});

describe('del()', () => {
  beforeEach(async () => {
    await cache.set(key, value);
  });

  test('deletes data from cache', async () => {
    expect(cache.get(key)).resolves.toEqual(value);
    await cache.del(key);
    expect(cache.get(key)).resolves.toBeUndefined();
  });
});
