const fetch = require("node-fetch");
const crypto = require('crypto');
require("dotenv").config();

exports.handler = async (event, context) => {
    try {
      // Extract body from the incoming request
      const { body } = event;
      const requestBody = JSON.parse(body);
  
      // Hash the plainToken
      const plainToken = requestBody.payload.plainToken;
      const hashedToken = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
                                  .update(plainToken)
                                  .digest('hex');
  
      // Create the response JSON object
      const responseObject = {
        plainToken: plainToken,
        encryptedToken: hashedToken
      };
  
      // Respond with the response JSON object
      return {
        statusCode: 200,
        body: JSON.stringify(responseObject)
      };
    } catch (error) {
      // Handle errors
      console.error("Error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "An error occurred" })
      };
    }
  };