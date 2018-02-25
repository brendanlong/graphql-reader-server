// @flow
export class Entry {
  id: number;

  constructor(id: number) {
    this.id = id;
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
  entries: Entry[];

  constructor(id: number, { uri }: FeedInput) {
    super({ uri });
    this.id = id;
    this.entries = [];
  }
}
