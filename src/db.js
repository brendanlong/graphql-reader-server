// @flow
import sqlite from "sqlite";

import type { EntryInput, FeedInput } from "./model";
import { Entry, Feed } from "./model";

const dbPromise = sqlite.open(":memory:").then(db => {
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
  `);
  return db;
});

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

  static rowToEntry({ id, feedId, title, content }: Object): Entry {
    return new Entry(id, feedId, { title, content });
  }

  static async getAll(): Promise<Entry[]> {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM Entry");
    const entries = [];
    for (const row of rows) {
      entries.push(EntryTable.rowToEntry(row));
    }
    return entries;
  }

  static async getByIds(ids: $ReadOnlyArray<number>): Promise<Array<?Entry>> {
    const db = await dbPromise;
    const placeholders = Array(ids.length)
      .fill("?")
      .join(",");
    const rows = await db.all(
      `SELECT * FROM Entry WHERE id IN(${placeholders})`,
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
    const rows = await db.all("SELECT id FROM Entry WHERE feedId = ?", feedId);
    const entries = [];
    for (const row of rows) {
      entries.push(row.id);
    }
    return entries;
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

  static rowToFeed({ id, uri }: Object): Feed {
    return new Feed(id, { uri });
  }

  static async getAll(): Promise<Feed[]> {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM Feed");
    const feeds = [];
    for (const row of rows) {
      feeds.push(FeedTable.rowToFeed(row));
    }
    return feeds;
  }

  static async getByIds(ids: $ReadOnlyArray<number>): Promise<Array<?Feed>> {
    const db = await dbPromise;
    const placeholders = Array(ids.length)
      .fill("?")
      .join(",");
    const rows = await db.all(
      `SELECT * FROM Feed WHERE id IN(${placeholders})`,
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
    const row = await db.get("SELECT * FROM Feed WHERE uri = ?", uri);
    if (row) {
      return FeedTable.rowToFeed(row);
    }
    return null;
  }
}
