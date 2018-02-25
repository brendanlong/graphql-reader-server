// @flow

import sqlite from "sqlite";

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

export class Entry {
  id: number;
  feedId: number;
  title: ?string;
  content: ?string;

  constructor(id: number, feedId: number, title: ?string, content: ?string) {
    this.id = id;
    this.feedId = feedId;
    this.title = title;
    this.content = content;
  }

  /* eslint-disable no-use-before-define */
  async feed(): Promise<Feed> {
    return Feed.getById(this.feedId);
  }
  /* eslint-enable no-use-before-define */

  static ofRow({ id, feedId, title, content }: Object): Entry {
    return new Entry(id, feedId, title, content);
  }

  static async getAll(): Promise<Entry[]> {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM Entry");
    const entries = [];
    for (const row of rows) {
      entries.push(Entry.ofRow(row));
    }
    return entries;
  }

  static async getById(id: number): Promise<Entry> {
    const db = await dbPromise;
    const row = await db.get("SELECT * FROM Entry WHERE id = ?", id);
    return Entry.ofRow(row);
  }

  static async getByFeedId(feedId: number): Promise<Entry[]> {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM Entry WHERE feedId = ?", feedId);
    const entries = [];
    for (const row of rows) {
      entries.push(Entry.ofRow(row));
    }
    return entries;
  }
}

export class FeedInput {
  uri: string;

  constructor({ uri }: { uri: string }) {
    this.uri = uri;
  }
}

export class Feed extends FeedInput {
  id: number;

  constructor(id: number, { uri }: FeedInput) {
    super({ uri });
    this.id = id;
  }

  async entries(): Promise<Entry[]> {
    return Entry.getByFeedId(this.id);
  }

  static async insert({ uri }: FeedInput): Promise<Feed> {
    const db = await dbPromise;
    const { lastID } = await db.run(
      "INSERT OR IGNORE INTO Feed (uri) VALUES (?)",
      uri
    );
    await db.run(
      "INSERT INTO Entry (title, content, feedId) VALUES (?, ?, ?)",
      "Example",
      "This is an example",
      lastID
    );
    return Feed.getById(lastID);
  }

  static ofRow({ id, uri }: Object): Feed {
    return new Feed(id, new FeedInput({ uri }));
  }

  static async getAll(): Promise<Feed[]> {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM Feed");
    const feeds = [];
    for (const row of rows) {
      feeds.push(Feed.ofRow(row));
    }
    return feeds;
  }

  static async getById(id: number): Promise<Feed> {
    const db = await dbPromise;
    const row = await db.get("SELECT * FROM Feed WHERE id = ?", id);
    return Feed.ofRow(row);
  }
}
