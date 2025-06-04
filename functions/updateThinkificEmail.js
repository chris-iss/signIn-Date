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
    // Validate API key
    const apiKey = event.queryStringParameters?.API_KEY;
    const validApiKey = process.env.Netlify_API_KEY;

    if (apiKey !== validApiKey) {
      isExecuting = false;
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized Access" }),
      };
    }

    // Parse request body
    const requestBody = JSON.parse(event.body);

    const { data } = requestBody

    // Send data to Zapier for further processing (e.g. Xero, Thinkific, HubSpot)
    await fetch("https://hooks.zapier.com/hooks/catch/14129819/2vgev9d/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: data
      }),
    });

    // console.log("Zapier webhook triggered successfully");

    isExecuting = false;
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };
  } catch (error) {
    console.error("Error processing data:", error.message);
    isExecuting = false;
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
