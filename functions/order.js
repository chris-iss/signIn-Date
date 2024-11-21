const fetch = require("node-fetch");
require("dotenv").config();
let isExecuting = false;

exports.handler = async (event) => {
  if (isExecuting) {
    return {
      statusCode: 409,
      body: JSON.stringify({ message: "Function is already executing" })
    };
  }
  isExecuting = true;

  try {
    // Debug: Log headers to identify the issue
    console.log("Incoming Request Headers:", event.headers);

    // Determine payload format and parse appropriately
    let requestBody;

    try {
      const contentType = event.headers?.["content-type"] || "application/json"; // Default to JSON if undefined
      console.log("Content-Type:", contentType);

      if (contentType.includes("application/json")) {
        requestBody = JSON.parse(event.body || "{}");
        console.log("Parsed JSON Body:", requestBody);
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const querystring = require("querystring");
        requestBody = querystring.parse(event.body || "");
        console.log("Parsed Form Data:", requestBody);
      } else {
        throw new Error(`Unsupported Content-Type: ${contentType}`);
      }
    } catch (parseError) {
      console.error("Error parsing request body:", parseError.message);
      isExecuting = false;
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid payload format", error: parseError.message })
      };
    }

    // Business logic or data handling (if any)
    console.log("Webhook processed successfully:", requestBody);
    isExecuting = false;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success", requestBody })
    };

  } catch (error) {
    console.error("Error processing data:", error.message);
    isExecuting = false;

    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message })
    };
  }
};
