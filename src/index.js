const { ApolloServer } = require("apollo-server-express");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { getUserId } = require("./utils");
const Query = require("./resolvers/Query");
const Mutation = require("./resolvers/Mutation");
const User = require("./resolvers/User");
const Link = require("./resolvers/Link");
const Vote = require("./resolvers/Vote");
const Subscription = require("./resolvers/Subscription");
const { createServer } = require("http");
const { execute, subscribe } = require("graphql");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const typeDefs = fs.readFileSync(
  path.join(__dirname, "schema.graphql"),
  "utf8"
);
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();

const resolvers = {
  Query,
  Mutation,
  Subscription: {
    newLink: {
      subscribe: () => pubsub.asyncIterator("NEW_LINK"),
      resolve: (payload) => {
        return payload;
      },
    },
    newVote: {
      subscribe: () => pubsub.asyncIterator("NEW_VOTE"),
      resolve: (payload) => {
        return payload;
      },
    },
  },
  User,
  Link,
  Vote,
};

(async function () {
  const app = express();

  const httpServer = createServer(app);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const server = new ApolloServer({
    schema,
    context: ({ req }) => {
      return {
        ...req,
        prisma,
        pubsub,
        userId: req && req.headers.authorization ? getUserId(req) : null,
      };
    },
  });
  await server.start();
  server.applyMiddleware({ app });

  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: server.graphqlPath }
  );

  const PORT = 4000;
  httpServer.listen(PORT, () =>
    console.log(`🚀 Server is now running on http://localhost:${PORT}/graphql`)
  );
})();

// startApolloServer(resolvers);
// async function startApolloServer(resolvers) {
//   const schema = makeExecutableSchema({
//     typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf8"),
//     resolvers,
//     context: ({ req }) => {
//       return {
//         ...req,
//         prisma,
//         userId: req && req.headers.authorization ? getUserId(req) : null,
//       };
//     },
//   });
//   // Same ApolloServer initialization as before
//   const server = new ApolloServer({ schema });
//   // Required logic for integrating with Express
//   await server.start();
//   const app = express();
//   server.applyMiddleware({
//     app,
//     path: "/",
//   });

//   SubscriptionServer.create(
//     { schema, execute, subscribe },
//     { server: httpServer, path: server.graphqlPath }
//   );

//   // Modified server startup
//   await new Promise((resolve) => httpServer.listen(4000, resolve));
//   console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
// }
