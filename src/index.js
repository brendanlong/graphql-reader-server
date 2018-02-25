// @flow
import express from "express";
import graphqlHTTP from "express-graphql";
import { makeExecutableSchema } from "graphql-tools";
import { GraphQLDateTime } from "graphql-iso-date";
import { GraphQLUrl } from "graphql-url";
import DataLoader from "dataloader";

import { Entry, Feed } from "./model";
import { EntryTable, FeedTable } from "./db";

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
  feedLoader: DataLoader<number, ?Feed>,
  feedEntryLoader: DataLoader<number, number[]>,
};

const resolveFunctions = {
  DateTime: GraphQLDateTime,
  URI: GraphQLUrl,
  Query: {
    entries: async (_, __, { entryLoader }: Loaders) => {
      const entries = await EntryTable.getAll();
      for (const entry of entries) {
        entryLoader.prime(entry.id, entry);
      }
      return entries;
    },
    feeds: async (_, __, { feedLoader }: Loaders) => {
      const feeds = await FeedTable.getAll();
      for (const feed of feeds) {
        feedLoader.prime(feed.id, feed);
      }
      return feeds;
    }
  },
  Mutation: {
    subscribeToFeed: async (_, { uri }, { feedLoader }: Loaders) => {
      await FeedTable.insert({ uri });
      const feed = await FeedTable.getByUri(uri);
      if (!feed) {
        return null;
      }
      feedLoader.prime(feed.id, feed);
      await EntryTable.insert(feed.id, {
        title: "Example",
        content: "This is an example"
      });
      return feed;
    }
  },
  Entry: {
    feed: ({ feedId }: Entry, _, { feedLoader }) => feedLoader.load(feedId)
  },
  Feed: {
    entries: async ({ id }: Feed, _, { entryLoader, feedEntryLoader }) => {
      const entryIds = await feedEntryLoader.load(id);
      return entryLoader.loadMany(entryIds);
    }
  }
};

const schema = makeExecutableSchema({
  typeDefs: schemaString,
  resolvers: resolveFunctions
});

const app = express();
app.use("/graphql", (req, res) => {
  const loaders: Loaders = {
    entryLoader: new DataLoader(EntryTable.getByIds),
    feedLoader: new DataLoader(FeedTable.getByIds),
    feedEntryLoader: new DataLoader(ids =>
      Promise.all(ids.map(EntryTable.getEntryIdsForFeed))
    )
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
