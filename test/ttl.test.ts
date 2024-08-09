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

const ttlDefault = 10;

const key = 'foo';
const value = 'bar';

beforeAll(async () => {
  cache = await caching(
    BunSqliteStore({
      name: 'test',
      path: ':memory:',
      ttl: ttlDefault,
    }),
  );
});
afterEach(async () => await cache.reset());

describe('ttl custom', async () => {
  const ttl = 5;
  beforeEach(async () => {
    await cache.set('foo', 'bar', ttl);
  });

  test('expired', async () => {
    expect(await cache.get<string>('foo')).toBe('bar');
    await Bun.sleep(ttl + 2);
    expect(await cache.get('foo')).toBe(undefined);
  });
});

describe('ttl default', () => {
  beforeEach(async () => {
    await cache.set(key, value);
  });

  test('expired', async () => {
    expect(await cache.get<string>('foo')).toBe('bar');
    await Bun.sleep(ttlDefault + 2);
    expect(await cache.get('foo')).toBe(undefined);
  });

  test('returns the ttl of the key', async () => {
    expect(cache.store.ttl(key)).resolves.toBeGreaterThan(0);
  });
});
