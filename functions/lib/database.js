const MongoClient = require("mongodb");

let cachedDb = null;

export const connectToDatabase = async () => {
    if (cachedDb) {
        console.log("Use existing connection");
        return Promise.resolve(cachedDb);
    } else {
        return MongoClient.connect(process.env.MONGODB_URI, {
            native_parser: true,
            useUnifiedTopology: true
        })
        .then((client) => {
            let db = client.db(process.env.MONGODB_DATABASE);
            console.log("New Database Connction:")
            cachedDb = db;

            return cachedDb;
        }).catch((error) => {
            console.log("Mongo Connection Error:")
            console.log(error);
        })
    }
}