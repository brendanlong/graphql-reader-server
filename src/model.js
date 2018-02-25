// @flow
export type EntryInput = {
  title?: string,
  content?: string
};

export class Entry {
  id: number;
  feedId: number;
  title: ?string;
  content: ?string;

  constructor(id: number, feedId: number, { title, content }: EntryInput) {
    this.id = id;
    this.feedId = feedId;
    this.title = title;
    this.content = content;
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
