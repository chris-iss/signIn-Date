const fetch = require("node-fetch")
require("dotenv").config();

exports.handle = async (event, context) => {
    const getNetlifyKey = event.queryStringParameters.API_KEY
    const getValidationKey = process.env.Netlify_API_KEY

    const response = {
        statusCode: 200,
        body: JSON.stringify({ message: "Received API_KEY successfully." }),
      };
  
      return response;
}