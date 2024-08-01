import { Database, type Statement } from 'bun:sqlite';
import type { Config, Milliseconds, Store } from 'cache-manager';

export type BunSqliteStoreOptions = {
  path?: string;

  /** table name */
  name?: string;

  /** purge interval in ms
   * @defaultValue 5 minutes
   */
  purgeInterval?: number;
} & Config;

type CacheEntity = {
  key: string;
  val: string;
  created_at: number;
  expired_at: number;
};

export class BunSqliteStoreClass implements Store {
  #sqlite: Database;

  #ttl: number | undefined;
  #isCacheable: (value: unknown) => boolean;

  #STATEMENTS: {
    select: Statement<CacheEntity, [string]>;
    keys: Statement<{ key: string }, [string]>;

    upsert: Statement;
    delete: Statement;
    reset: Statement;

    purge: Statement;
  };

  constructor(options?: BunSqliteStoreOptions) {
    if (!options?.path) {
      throw new Error('Missing path');
    }

    if (!options?.name) {
      throw new Error('Missing table name');
    }

    this.#isCacheable = options?.isCacheable ?? ((val) => val !== undefined);

    this.#sqlite = new Database(options.path);
    this.#ttl = options?.ttl;

    const tableName = options.name;
    this.#sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        'key' TEXT PRIMARY KEY,
        'val' TEXT,
        'created_at' INTEGER,
        'expired_at' INTEGER
      );
      CREATE INDEX IF NOT EXISTS index_expire_cache ON ${tableName}(expired_at);
    `);
    this.#sqlite.exec('PRAGMA journal_mode = WAL;');

    this.#STATEMENTS = {
      select: this.#sqlite.query(`SELECT * FROM ${tableName} WHERE key = ?`),
      keys: this.#sqlite.query(`SELECT key FROM ${tableName} WHERE key LIKE ?`),
      upsert: this.#sqlite.query(
        `INSERT OR REPLACE INTO ${tableName} (key, val, created_at, expired_at) VALUES (?, ?, ?, ?)`,
      ),
      delete: this.#sqlite.query(`DELETE FROM ${tableName} WHERE key = ?`),
      reset: this.#sqlite.query(`DELETE FROM ${tableName}`),
      purge: this.#sqlite.query(
        `DELETE FROM ${tableName} WHERE expired_at < ?`,
      ),
    };

    setInterval(
      () => {
        const ts = Date.now();
        this.#STATEMENTS.purge.run(ts);
      },
      options.purgeInterval ?? 5 * 60 * 1000,
    );
  }

  async get<T>(key: string): Promise<T | undefined> {
    const ts = Date.now();
    const result = this.#STATEMENTS.select.get(key);

    if (result && (result.expired_at === -1 || result.expired_at > ts)) {
      return JSON.parse(result.val);
    }
  }

  async getExpired<T>(key: string): Promise<T | undefined> {
    const result = this.#STATEMENTS.select.get(key);

    if (result) {
      return JSON.parse(result.val);
    }
  }

  async ttl(key: string): Promise<number> {
    const result = this.#STATEMENTS.select.get(key);
    if (!result) {
      return -2;
    }
    if (result.expired_at === -1) {
      return -1;
    }
    return result.expired_at - Date.now();
  }

  async set<T>(key: string, data: T, ttl?: Milliseconds): Promise<void> {
    const t = ttl ?? this.#ttl;
    const created_at = Date.now();
    const expired_at = t ? created_at + t : -1;

    if (!this.#isCacheable(data)) {
      throw new Error(`no cacheable value ${JSON.stringify(data)}`);
    }

    this.#STATEMENTS.upsert.run(
      key,
      JSON.stringify(data),
      created_at,
      expired_at,
    );
  }

  async del(key: string): Promise<void> {
    this.#STATEMENTS.delete.run(key);
  }

  async keys(pattern?: string): Promise<string[]> {
    return this.#STATEMENTS.keys
      .all(pattern?.replace('*', '%') ?? '%')
      .map((cache) => cache.key);
  }

  async mget<T>(...args: string[]): Promise<T[]> {
    const ts = Date.now();

    const trans = this.#sqlite.transaction((keys: string[]) => {
      return keys
        .map((key) => this.#STATEMENTS.select.get(key))
        .filter(
          (data) => data && (data.expired_at === -1 || data.expired_at > ts),
        );
    });

    const result: T[] = trans(args).map((data: CacheEntity) =>
      JSON.parse(data.val),
    );

    const fillLen = args.length - result.length;
    if (fillLen) {
      return result.concat(Array(fillLen).fill(undefined));
    }

    return result;
  }

  async mset(args: [string, unknown][], ttl?: Milliseconds): Promise<void> {
    const t = ttl ?? this.#ttl;
    const created_at = Date.now();
    const expired_at = t ? created_at + t : -1;

    const trans = this.#sqlite.transaction(
      (args: [string, unknown][], created_at: number, expired_at: number) => {
        for (const [key, data] of args) {
          if (!this.#isCacheable(data)) {
            throw new Error(`no cacheable value ${JSON.stringify(data)}`);
          }

          this.#STATEMENTS.upsert.run(
            key,
            JSON.stringify(data),
            created_at,
            expired_at,
          );
        }
      },
    );

    trans(args, created_at, expired_at);
  }

  async mdel(...args: string[]): Promise<void> {
    const trans = this.#sqlite.transaction((keys: string[]) => {
      for (const key of keys) {
        this.#STATEMENTS.delete.run(key);
      }
    });
    trans(args);
  }

  async reset(): Promise<void> {
    this.#STATEMENTS.reset.run();
  }
}

export const BunSqliteStore = (
  options: BunSqliteStoreOptions,
): BunSqliteStoreClass => {
  return new BunSqliteStoreClass(options);
};
