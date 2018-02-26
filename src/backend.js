// @flow
import type { EntryInput, FeedInput } from "./model";
import { Entry, Feed } from "./model";

export type EntrySearch = {
  ids?: $ReadOnlyArray<number>,
  feedIds?: $ReadOnlyArray<number>
};

export type FeedSearch = {
  ids?: $ReadOnlyArray<number>
};

export interface Backend {
  insertEntry(feedId: number, guid: string, input: EntryInput): Promise<?number>;

  getEntries(?EntrySearch): Promise<Entry[]>;

  insertFeed(FeedInput): Promise<?number>;

  getFeeds(?FeedSearch): Promise<Feed[]>;

  getFeedByUri(uri: string): Promise<?Feed>;
}
