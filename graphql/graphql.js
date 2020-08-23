const { ApolloServer, gql } = require('apollo-server-lambda');
const AWS = require('aws-sdk');
const { v4: uuid } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const typeDefs = gql`
  type Comment {
    id: ID!
    createdAt: String!
    body: String!
  }

  type Quote {
    id: ID!
    title: String!
    createdAt: String!
    link: String
    quote: String
    comments: [Comment!]!
  }

  type Query {
    hello: String
    quotes: [Quote!]!
  }

  input QuoteInput {
    title: String!
    link: String
    quote: String
  }

  type Mutation {
    addQuote(quoteInput: QuoteInput!): Quote
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    quotes: () => {
      console.log('Fetching quotes from DynamoDB');

      return new Promise((resolve, reject) => {
        dynamoDb.scan({ TableName: process.env.DYNAMODB_TABLE }, (err, data) => {
          if (err) {
            console.log('Error occurred fetching quotes from DynamoDB');
            reject(err);
          }

          console.log('Successfully fetched quotes from DynamoDB', { data });
          resolve(data.Items);
        });
      });
    },
  },
  Mutation: {
    addQuote: (_, { quoteInput: { title, link, quote } }) => {
      const QuoteItem = {
        id: uuid(),
        createdAt: new Date().toISOString(),
        title,
        link,
        quote,
        comments: [],
      };

      console.log('Adding new quote to DynamoDB', { QuoteItem });

      return new Promise((resolve, reject) => {
        dynamoDb.put(
          {
            Item: QuoteItem,
            TableName: process.env.DYNAMODB_TABLE,
          },
          (err) => {
            if (err) {
              console.log('Error adding new quote to DynamoDB', { err });
              reject(err);
            }

            console.log('Successfully added new quote to DynamoDB', { QuoteItem });
            resolve(QuoteItem);
          }
        );
      });
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: process.env.NODE_ENV !== 'production' && {
    endpoint: '/dev/graphql',
  },
});

exports.graphqlHandler = server.createHandler({
  cors: {
    origin: true,
    credentials: true,
  },
});
