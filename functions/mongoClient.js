const { MongoClient } = require("mongodb");

let client;

const getMongoClient = async () => {

  if (!client) {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log("Connected to MongoDB");
  }

  return client;

};

module.exports = getMongoClient;