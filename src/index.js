// @flow
import express from "express";
import graphqlHTTP from "express-graphql";
import { makeExecutableSchema } from "graphql-tools";
import { GraphQLDateTime } from "graphql-iso-date";
import { GraphQLUrl } from "graphql-url";

class Entry {
  id: number;
  feed: Feed;
}

class Feed {
  id: number;
  uri: string;
  entries: Entry[];

  constructor(id: number, { uri }: { uri: string }) {
    this.id = id;
    this.uri = uri;
    this.entries = [];
  }
}

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
    nickname: String
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

const resolveFunctions = {
  DateTime: GraphQLDateTime,
  URI: GraphQLUrl
};

const schema = makeExecutableSchema({
  typeDefs: schemaString,
  resolvers: resolveFunctions
});

const root = {
  entries: () => [],
  feeds: () => [],
  subscribeToFeed: ({ uri }) => new Feed(1, { uri })
};

const app = express();
app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true
  })
);
app.listen(4000);
console.log("Running GraphQL API server at localhost:4000/graphql");
