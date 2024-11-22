const fetch = require("node-fetch");
//const { MongoClient } = require("mongodb");
require("dotenv").config();

let isExecuting = false;

// const mongoClient = new MongoClient(process.env.MONGO_URI);

// const clientPromise = mongoClient.connect();


exports.handler = async (event) => {
  if (isExecuting) {
    return {
      statusCode: 409,
      body: JSON.stringify({ message: "Function is already executing" })
    };
  }

  isExecuting = true;

  try {

    // Validate API key
    const getNetlifyKey = event.queryStringParameters?.API_KEY;
    const getValidationKey = process.env.Netlify_API_KEY;

    if (getNetlifyKey !== getValidationKey) {
      console.error("Unauthorized Access: Invalid API Key");
      isExecuting = false;
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized Access" })
      };
    }

    // Check for request body
    if (!event.body) {
      console.error("Empty body received");
      isExecuting = false;
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Request body is empty or missing" })
      };
    }

    // Determine payload format and parse appropriately
    let requestBody;

    try {
    //   const database = (await clientPromise).db(process.env.MONGODB_DATABASE);
    //   const collection = database.collection(process.env.MONGODB_COLLECTION);
    //   const results = await collection.find({}).limit(10).toArray();

    //   let response = await fetch("/.netlify/functions/order?API_KEY=900381b0-ab33-4bf3-8e61-ee4161d43b81")
    //   .then((res) => res.json());
      requestBody = JSON.parse(event.body);

      console.log("USERS RESULT:", response)

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Success", requestBody })
      };


    //   requestBody = JSON.parse(event.body);
    //   //console.log("Parsed JSON Body:", requestBody);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError.message);
      isExecuting = false;
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid payload format", error: parseError.message })
      };
    }

  } catch (error) {
    console.error("Error processing data:", error.message);

    isExecuting = false;
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message })
    };
  }
};
