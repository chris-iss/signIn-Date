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
    console.log("Event received:", JSON.stringify(event, null, 2));

    // Validate API key
    const getNetlifyKey = event.queryStringParameters?.API_KEY;
    const getValidationKey = process.env.Netlify_API_KEY;

    console.log("Received API Key:", getNetlifyKey);
    console.log("Expected API Key:", getValidationKey);

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
    const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || ""; // Case-insensitive handling

    try {
      console.log("Content-Type:", contentType);

      if (contentType.includes("application/json")) {
        requestBody = JSON.parse(event.body);
        console.log("Parsed JSON Body:", requestBody);
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const querystring = require("querystring");
        requestBody = querystring.parse(event.body);
        console.log("Parsed Form Data:", requestBody);
      } else {
        console.error(`Unsupported Content-Type: ${contentType}`);
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
