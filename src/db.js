// @flow
import sqlite from "sqlite";

import type { EntryInput, FeedInput } from "./model";
import { Entry, Feed } from "./model";

const dbPromise: Promise<sqlite.Database> = sqlite.open(":memory:").then(db =>
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE Feed(
      id integer primary key autoincrement,
      uri text not null unique,
      title text);

    CREATE TABLE Entry(
      id integer primary key autoincrement,
      feedId integer not null references Feed(id),
      title text,
      content text
    );
  `)
);

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
  static async insert(
    feedId: number,
    { title, content }: EntryInput
  ): Promise<number> {
    const db = await dbPromise;
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

  static async getAll(): Promise<Entry[]> {
    const db = await dbPromise;
    const rows: EntryRow[] = await db.all("SELECT * FROM Entry");
    return rows.map(EntryTable.rowToEntry);
  }

  static async getByIds(ids: $ReadOnlyArray<number>): Promise<Array<?Entry>> {
    const db = await dbPromise;
    const rows: EntryRow[] = await db.all(
      `SELECT * FROM Entry WHERE id IN(${placeholders(ids.length)})`,
      ids
    );
    const rowsById: Map<number, Entry> = new Map();
    for (const row of rows) {
      rowsById.set(row.id, EntryTable.rowToEntry(row));
    }
    return ids.map(id => rowsById.get(id));
  }

  static async getEntryIdsForFeed(feedId: number): Promise<number[]> {
    const db = await dbPromise;
    const rows: IdRow[] = await db.all(
      "SELECT id FROM Entry WHERE feedId = ?",
      feedId
    );
    return rows.map(row => row.id);
  }
}

export class FeedTable {
  static async insert({ uri }: FeedInput): Promise<?Feed> {
    const db = await dbPromise;
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

  static async getAll(): Promise<Feed[]> {
    const db = await dbPromise;
    const rows: FeedRow[] = await db.all("SELECT * FROM Feed");
    return rows.map(FeedTable.rowToFeed);
  }

  static async getByIds(ids: $ReadOnlyArray<number>): Promise<Array<?Feed>> {
    const db = await dbPromise;
    const rows: FeedRow[] = await db.all(
      `SELECT * FROM Feed WHERE id IN(${placeholders(ids.length)})`,
      ids
    );
    const rowsById: Map<number, Feed> = new Map();
    for (const row of rows) {
      rowsById.set(row.id, FeedTable.rowToFeed(row));
    }
    return ids.map(id => rowsById.get(id));
  }

  static async getByUri(uri: string): Promise<?Feed> {
    const db = await dbPromise;
    const row: FeedRow = await db.get("SELECT * FROM Feed WHERE uri = ?", uri);
    if (row) {
      return FeedTable.rowToFeed(row);
    }
    return null;
  }
}
