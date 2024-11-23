const fetch = require("node-fetch");
const { MongoClient } = require("mongodb");
const { performance } = require("perf_hooks");
require("dotenv").config();

let isExecuting = false;

const mongoClient = new MongoClient(process.env.MONGO_URI);
const clientPromise = mongoClient.connect();

exports.handler = async (event) => {
  if (isExecuting) {
    return {
      statusCode: 409,
      body: JSON.stringify({ message: "Function is already executing" }),
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
        body: JSON.stringify({ message: "Unauthorized Access" }),
      };
    }

    // Check for request body
    if (!event.body) {
      console.error("Empty body received");
      isExecuting = false;
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Request body is empty or missing" }),
      };
    }

    // Parse and time the request body
    let requestBody;
    try {
      const startParseTime = performance.now();
      requestBody = JSON.parse(event.body);
      const endParseTime = performance.now();

      console.log(
        "Request parsed in:",
        (endParseTime - startParseTime).toFixed(3),
        "ms"
      );
    } catch (parseError) {
      console.error("Error parsing request body:", parseError.message);
      isExecuting = false;
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid payload format",
          error: parseError.message,
        }),
      };
    }

    // Extract data from request body
    const fName = requestBody.billing?.first_name || "N/A";
    const lastName = requestBody.billing?.last_name || "N/A";
    const course = requestBody.line_items?.[0]?.name || "Unknown Course";
    const quantity = requestBody.line_items?.[0]?.quantity || 0;
    const amount = requestBody.line_items?.[0]?.subtotal || "0";
    const status = requestBody.status || "unknown";
    const date = new Date();

    console.log("Extracted Data:", {
      firstname: fName,
      lastname: lastName,
      course,
      quantity,
      amount,
      status,
    });

    // Connect to MongoDB and insert the data
    try {
      const startDbTime = performance.now();
      const database = (await clientPromise).db(process.env.MONGODB_DATABASE);
      const collection = database.collection(process.env.MONGODB_COLLECTION);

      const sendDataToMongo = await collection.insertOne({
        firstname: fName,
        lastname: lastName,
        course: course,
        quantity: quantity,
        amount: amount,
        status: status,
        date: date,
      });

      const endDbTime = performance.now();
      console.log(
        "Data inserted into DB in:",
        (endDbTime - startDbTime).toFixed(3),
        "ms"
      );
      console.log("MongoDB Insert Result:", sendDataToMongo);

      isExecuting = false;
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Success", sendDataToMongo }),
      };
    } catch (dbError) {
      console.error("Error inserting into MongoDB:", dbError.message);
      isExecuting = false;
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Database insertion failed",
          error: dbError.message,
        }),
      };
    }
  } catch (error) {
    console.error("Unexpected error:", error.message);
    isExecuting = false;
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
