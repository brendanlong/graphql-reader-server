// @flow
export type EntryInput = {
  uri?: ?string,
  title?: ?string,
  author?: ?string,
  content?: ?string,
  updated?: ?Date,
  published?: ?Date
};

export class Entry {
  id: number;
  guid: string;
  feedId: number;
  uri: ?string;
  title: ?string;
  author: ?string;
  content: ?string;
  updated: ?Date;
  published: ?Date;

  constructor(
    id: number,
    guid: string,
    feedId: number,
    { uri, title, author, content, updated, published }: EntryInput
  ) {
    this.id = id;
    this.guid = guid;
    this.feedId = feedId;
    this.uri = uri;
    this.title = title;
    this.author = author;
    this.content = content;
    this.updated = updated;
    this.published = published;
  }
}

export type FeedInput = {
  uri: string
};

export class Feed {
  id: number;
  uri: string;

  constructor(id: number, { uri }: FeedInput) {
    this.id = id;
    this.uri = uri;
  }
}
