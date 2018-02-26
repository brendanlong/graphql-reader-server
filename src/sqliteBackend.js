// @flow
import sqlite from "sqlite";

import type { Backend, EntrySearch, FeedSearch } from "./backend";
import type { EntryInput, FeedInput } from "./model";
import { Entry, Feed } from "./model";

type EntryRow = {
  id: number,
  feedId: number,
  title: ?string,
  content: ?string
};

type FeedRow = {
  id: number,
  uri: string,
  title: ?string
};

type IdRow = {
  id: number
};

function placeholders(n: number) {
  return Array(n)
    .fill("?")
    .join(",");
}

export class EntryTable {
  dbPromise: Promise<sqlite.Database>;

  constructor(dbPromise: Promise<sqlite.Database>) {
    this.dbPromise = dbPromise.then(db =>
      db.exec(`
        CREATE TABLE Entry(
          id integer primary key autoincrement,
          feedId integer not null references Feed(id),
          title text,
          content text
        );
      `)
    );
  }

  async insert(
    feedId: number,
    { title, content }: EntryInput
  ): Promise<number> {
    const db = await this.dbPromise;
    const { lastID } = await db.run(
      "INSERT INTO Entry (title, content, feedId) VALUES (?, ?, ?)",
      title,
      content,
      feedId
    );
    return lastID;
  }

  static rowToEntry({ id, feedId, title, content }: EntryRow): Entry {
    return new Entry(id, feedId, { title, content });
  }

  async getAll(): Promise<Entry[]> {
    const db = await this.dbPromise;
    const rows: EntryRow[] = await db.all("SELECT * FROM Entry");
    return rows.map(EntryTable.rowToEntry);
  }

  async getByIds(ids: $ReadOnlyArray<number>): Promise<Entry[]> {
    const db = await this.dbPromise;
    const rows: EntryRow[] = await db.all(
      `SELECT * FROM Entry WHERE id IN(${placeholders(ids.length)})`,
      ids
    );
    return rows.map(EntryTable.rowToEntry);
  }

  async getEntryIdsForFeed(feedId: number): Promise<number[]> {
    const db = await this.dbPromise;
    const rows: IdRow[] = await db.all(
      "SELECT id FROM Entry WHERE feedId = ?",
      feedId
    );
    return rows.map(row => row.id);
  }
}

export class FeedTable {
  dbPromise: Promise<sqlite.Database>;

  constructor(dbPromise: Promise<sqlite.Database>) {
    this.dbPromise = dbPromise.then(db =>
      db.exec(`
        CREATE TABLE Feed(
          id integer primary key autoincrement,
          uri text not null unique,
          title text);
      `)
    );
  }

  async insert({ uri }: FeedInput): Promise<?number> {
    const db = await this.dbPromise;
    try {
      const { lastID } = await db.run("INSERT INTO Feed (uri) VALUES (?)", uri);
      return lastID;
    } catch (e) {
      // Check for unique key violation
      if (e.errno !== 19) {
        throw e;
      }
      return null;
    }
  }

  static rowToFeed({ id, uri }: FeedRow): Feed {
    return new Feed(id, { uri });
  }

  async getAll(): Promise<Feed[]> {
    const db = await this.dbPromise;
    const rows: FeedRow[] = await db.all("SELECT * FROM Feed");
    return rows.map(FeedTable.rowToFeed);
  }

  async getByIds(ids: $ReadOnlyArray<number>): Promise<Feed[]> {
    const db = await this.dbPromise;
    const rows: FeedRow[] = await db.all(
      `SELECT * FROM Feed WHERE id IN(${placeholders(ids.length)})`,
      ids
    );
    return rows.map(FeedTable.rowToFeed);
  }

  async getByUri(uri: string): Promise<?Feed> {
    const db = await this.dbPromise;
    const row: FeedRow = await db.get("SELECT * FROM Feed WHERE uri = ?", uri);
    if (row) {
      return FeedTable.rowToFeed(row);
    }
    return null;
  }
}

export default class SqliteBackend implements Backend {
  entryTable: EntryTable;
  feedTable: FeedTable;

  constructor() {
    const dbPromise = sqlite.open(":memory:");
    this.entryTable = new EntryTable(dbPromise);
    this.feedTable = new FeedTable(dbPromise);
  }

  insertEntry(feedId: number, input: EntryInput) {
    return this.entryTable.insert(feedId, input);
  }

  getEntries(search: ?EntrySearch) {
    if (search) {
      const { ids } = search;
      if (ids) {
        return this.entryTable.getByIds(ids);
      }
    }
    return this.entryTable.getAll();
  }

  insertFeed(input: FeedInput) {
    return this.feedTable.insert(input);
  }

  getFeeds(search: ?FeedSearch) {
    if (search) {
      const { ids } = search;
      if (ids) {
        return this.feedTable.getByIds(ids);
      }
    }
    return this.feedTable.getAll();
  }

  getFeedByUri(uri: string) {
    return this.feedTable.getByUri(uri);
  }

  getEntryIdsForFeedIds(feedIds: $ReadOnlyArray<number>) {
    return Promise.all(
      feedIds.map(id => this.entryTable.getEntryIdsForFeed(id))
    );
  }
}
