// @flow
import express from "express";
import graphqlHTTP from "express-graphql";
import { makeExecutableSchema } from "graphql-tools";
import { GraphQLDateTime } from "graphql-iso-date";
import { GraphQLUrl } from "graphql-url";
import DataLoader from "dataloader";
import { defaultTo } from "lodash";
import feedparser from "feedparser-promised";

import { Entry, Feed } from "./model";
import Backend from "./sqliteBackend";

const backend = new Backend();

const schemaString = `
  scalar DateTime
  scalar URI

  type Entry {
    id: ID!
    uri: URI
    title: String
    author: String
    content: String
    updated: DateTime
    published: DateTime
    feed: Feed!
  }

  type Feed {
    id: ID!
    uri: URI!
    title: String
    updated: DateTime
    entries: [Entry!]!
  }

  type Query {
    entries(first: Int, last: Int, publishedSince: DateTime, updatedSince: DateTime): [Entry!]!
    feeds(first: Int, last: Int): [Feed!]!
  }

  type Mutation {
    subscribeToFeed(uri: URI!): Feed
  }
`;

type Loaders = {
  entryLoader: DataLoader<number, ?Entry>,
  entriesByFeedIdLoader: DataLoader<number, Entry[]>,
  feedLoader: DataLoader<number, ?Feed>
};

const resolveFunctions = {
  DateTime: GraphQLDateTime,
  URI: GraphQLUrl,
  Query: {
    entries: async (obj, args, { entryLoader }: Loaders) => {
      const entries = await backend.getEntries();
      for (const entry of entries) {
        if (entry) {
          entryLoader.prime(entry.id, entry);
        }
      }
      return entries;
    },
    feeds: async (obj, args, { feedLoader }: Loaders) => {
      const feeds = await backend.getFeeds();
      for (const feed of feeds) {
        if (feed) {
          feedLoader.prime(feed.id, feed);
        }
      }
      return feeds;
    }
  },
  Mutation: {
    subscribeToFeed: async (obj, { uri }, { feedLoader }: Loaders) => {
      await backend.insertFeed({ uri });
      const feed = await backend.getFeedByUri(uri);
      if (!feed) {
        return null;
      }
      feedLoader.prime(feed.id, feed);

      const items = await feedparser.parse(feed.uri);
      await Promise.all(
        items.map(item =>
          backend.insertEntry(feed.id, item.guid, {
            uri: item.link,
            author: item.author,
            title: item.title,
            content: item.description,
            updated: item.date,
            published: item.pubdate
          })
        )
      );
      return feed;
    }
  },
  Entry: {
    feed: ({ feedId }: Entry, args, { feedLoader }: Loaders) =>
      feedLoader.load(feedId)
  },
  Feed: {
    entries: ({ id }: Feed, args, { entriesByFeedIdLoader }: Loaders) =>
      entriesByFeedIdLoader.load(id)
  }
};

const schema = makeExecutableSchema({
  typeDefs: schemaString,
  resolvers: resolveFunctions
});

const app = express();
app.use("/graphql", (req, res) => {
  const loaders: Loaders = {
    entryLoader: new DataLoader(async ids => {
      const entries = await backend.getEntries({ ids });
      const byId: Map<number, Entry> = new Map();
      for (const entry of entries) {
        byId.set(entry.id, entry);
      }
      return ids.map(id => byId.get(id));
    }),
    feedLoader: new DataLoader(async ids => {
      const feeds = await backend.getFeeds({ ids });
      const byId: Map<number, Feed> = new Map();
      for (const feed of feeds) {
        byId.set(feed.id, feed);
      }
      return ids.map(id => byId.get(id));
    }),
    entriesByFeedIdLoader: new DataLoader(async feedIds => {
      const entries = await backend.getEntries({ feedIds });
      const byFeedId: Map<number, Entry[]> = new Map();
      for (const entry of entries) {
        const feedEntries = defaultTo(byFeedId.get(entry.feedId), []);
        if (feedEntries.length === 0) {
          byFeedId.set(entry.feedId, feedEntries);
        }
        feedEntries.push(entry);
      }
      return feedIds.map(id => defaultTo(byFeedId.get(id), []));
    })
  };

  return graphqlHTTP({
    schema,
    graphiql: true,
    pretty: true,
    context: loaders
  })(req, res);
});
app.listen(4000);
console.log("Running GraphQL API server at localhost:4000/graphql");
