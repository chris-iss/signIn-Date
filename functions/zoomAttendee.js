const crypto = require('crypto');

exports.handler = async (event, context) => {
  try {
    // Check if ZOOM_WEBHOOK_SECRET_TOKEN is defined
    if (!process.env.ZOOM_WEBHOOK_SECRET_TOKEN) {
        throw new Error('ZOOM_WEBHOOK_SECRET_TOKEN is missing or undefined');
      }
      
    // Extract body from the incoming request
    const { body, queryStringParameters } = event;
    console.log("QUERY", queryStringParameters)
    const requestBody = JSON.parse(body);

    // Hash the plainToken
    const plainToken = requestBody.payload.plainToken;
    console.log("plain-TOKEN", plainToken)
    const hashedToken = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN).update(plainToken).digest('hex');

    // Create the response JSON object
    const responseObject = {
      plainToken: plainToken,
      encryptedToken: hashedToken
    };


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

