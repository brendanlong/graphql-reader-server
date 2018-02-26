// @flow
import type { EntryInput, FeedInput } from "./model";
import { Entry, Feed } from "./model";

export type EntrySearch = {
  ids?: $ReadOnlyArray<number>
};

export type FeedSearch = {
  ids?: $ReadOnlyArray<number>
};

export interface Backend {
  insertEntry(feedId: number, input: EntryInput): Promise<number>;

  getEntries(?EntrySearch): Promise<Entry[]>;

  insertFeed(FeedInput): Promise<?number>;

  getFeeds(?FeedSearch): Promise<Feed[]>;

  getFeedByUri(uri: string): Promise<?Feed>;

  getEntryIdsForFeedIds(feedIds: $ReadOnlyArray<number>): Promise<number[][]>;
}
