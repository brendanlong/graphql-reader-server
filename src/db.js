// @flow
import sqlite from "sqlite";

import { Entry, Feed, FeedInput} from "./model";

const dbPromise = sqlite.open(":memory:").then(db => {
  db.run(`
    CREATE TABLE Feed(
      id integer primary key autoincrement,
      uri text not null,
      title text);

    CREATE TABLE Entry(
      id integer primary key autoincrement,
      feed_id integer not null references Feed.id,
      title text,
      content text
    );
  `);
  return db
});

export class EntryTable {
  static entryOfRow({ id }: Object): Entry {
    return new Entry(id);
  }

  static async getAll(): Promise<Entry[]> {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM Entry");
    const entries = [];
    for (const row of rows) {
      entries.push(EntryTable.entryOfRow(row));
    }
    return entries;
  }

  static async getById(id: number): Promise<Entry> {
    const db = await dbPromise;
    const row = await db.get("SELECT * FROM Entry WHERE id = ?", id);
    return EntryTable.entryOfRow(row);
  }
}

export class FeedTable {
  static async insert({ uri }: FeedInput): Promise<Feed> {
    const db = await dbPromise;
    const { lastID } = await db.run("INSERT INTO Feed (uri) VALUES (?)", uri);
    return FeedTable.getById(lastID);
  }

  static feedOfRow({ id, uri }: Object): Feed {
    return new Feed(id, new FeedInput({ uri }));
  }

  static async getAll(): Promise<Feed[]> {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM Feed");
    const feeds = [];
    for (const row of rows) {
      feeds.push(FeedTable.feedOfRow(row));
    }
    return feeds;
  }

  static async getById(id: number): Promise<Feed> {
    const db = await dbPromise;
    const row = await db.get("SELECT * FROM Feed WHERE id = ?", id);
    return FeedTable.feedOfRow(row);
  }
}
