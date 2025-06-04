const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

exports.handler = async (event) => {
  if (isExecuting) {
    return {
      statusCode: 409,
      body: JSON.stringify({ message: "Function is already executing" }),
    };
  }

  isExecuting = true;

  try {
    // ✅ Validate API key
    const apiKey = event.queryStringParameters?.API_KEY;
    const validApiKey = process.env.Netlify_API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
      isExecuting = false;
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized Access" }),
      };
    }

    // ✅ Parse request body safely
    let requestBody = {};
    try {
      requestBody = JSON.parse(event.body || "{}");
    } catch (err) {
      isExecuting = false;
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid JSON in request body" }),
      };
    }

    const { data } = requestBody;

    if (!data) {
      isExecuting = false;
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "'data' field is required in request body" }),
      };
    }

    // ✅ Send data to Zapier
    const zapierResponse = await fetch("https://hooks.zapier.com/hooks/catch/14129819/2vgev9d/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });

    if (!zapierResponse.ok) {
      throw new Error(`Zapier returned ${zapierResponse.status}`);
    }

    isExecuting = false;
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };
  } catch (error) {
    console.error("Error processing data:", error);
    isExecuting = false;
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || "Internal Server Error" }),
    };
  }
};
