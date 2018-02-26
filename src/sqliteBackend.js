// @flow
import sqlite from "sqlite";

import type { Backend, EntrySearch, FeedSearch } from "./backend";
import type { EntryInput, FeedInput } from "./model";
import { Entry, Feed } from "./model";

type EntryRow = {
  id: number,
  guid: string,
  feedId: number,
  uri: ?string,
  title: ?string,
  author: ?string,
  content: ?string,
  updated: ?number,
  published: ?number
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
          guid integer not null,
          feedId integer not null references Feed(id),
          uri text,
          title text,
          author text,
          content text,
          updated real,
          published real,
          UNIQUE(feedId, guid)
        );
      `)
    );
  }

  async insert(
    feedId: number,
    guid: string,
    { uri, title, author, content, updated, published }: EntryInput
  ): Promise<?number> {
    const db = await this.dbPromise;
    try {
      const { lastID } = await db.run(
        `
        INSERT INTO Entry (guid, uri, title, author, content, feedId, updated, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        guid,
        uri,
        title,
        author,
        content,
        feedId,
        updated ? updated.getTime() / 1000 : null,
        published ? published.getTime() / 1000 : null
      );
      return lastID;
    } catch (e) {
      // Check for unique key violation
      if (e.errno !== 19) {
        throw e;
      }
      return null;
    }
  }

  static rowToEntry({
    id,
    guid,
    feedId,
    uri,
    title,
    author,
    content,
    updated,
    published
  }: EntryRow): Entry {
    return new Entry(id, guid, feedId, {
      uri,
      title,
      author,
      content,
      updated: updated ? new Date(updated * 1000) : null,
      published: published ? new Date(published * 1000) : null
    });
  }

  async search(search?: ?EntrySearch): Promise<Entry[]> {
    const where = [];
    const params = [];
    if (search) {
      const { ids, feedIds } = search;
      if (ids) {
        where.push(`id IN (${placeholders(ids.length)})`);
        params.push.apply(params, ids);
      }
      if (feedIds) {
        where.push(`feedId IN (${placeholders(feedIds.length)})`);
        params.push.apply(params, feedIds);
      }
    }
    let query = "SELECT * FROM Entry";
    if (where.length > 0) {
      query = `${query} WHERE ${where.join("AND")}`;
    }
    const db = await this.dbPromise;
    const rows: EntryRow[] = await db.all(query, params);
    return rows.map(EntryTable.rowToEntry);
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

  async search(search?: ?FeedSearch): Promise<Feed[]> {
    const where = [];
    const params = [];
    if (search) {
      const { ids } = search;
      if (ids) {
        where.push(`id IN (${placeholders(ids.length)})`);
        params.push.apply(params, ids);
      }
    }
    let query = "SELECT * FROM Feed";
    if (where.length > 0) {
      query = `${query} WHERE ${where.join("AND")}`;
    }
    const db = await this.dbPromise;
    const rows: FeedRow[] = await db.all(query, params);
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

  insertEntry(feedId: number, guid: string, input: EntryInput) {
    return this.entryTable.insert(feedId, guid, input);
  }

  getEntries(search: ?EntrySearch) {
    return this.entryTable.search(search);
  }

  insertFeed(input: FeedInput) {
    return this.feedTable.insert(input);
  }

  getFeeds(search: ?FeedSearch) {
    return this.feedTable.search(search);
  }

  getFeedByUri(uri: string) {
    return this.feedTable.getByUri(uri);
  }
}
