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
        // Validate API key
        const getNetlifyKey = event.queryStringParameters?.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;

        if (getNetlifyKey !== getValidationKey) {
            isExecuting = false;
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        // Parse request body and check for orderId
        const requestBody = JSON.parse(event.body);
        

        isExecuting = false;
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success" })
        };
    } catch (error) {
        console.error('Error processing data:', error.message);
        isExecuting = false;
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message })
        };
    }
};
