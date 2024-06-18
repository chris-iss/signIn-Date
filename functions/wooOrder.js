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
        const getNetlifyKey = event.queryStringParameters && event.queryStringParameters.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;

        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        console.log("Event Body:", event.body); // Log the event body for debugging
        const requestBody = JSON.parse(event.body);
        const orderId = requestBody.orderId;
        console.log("OrderId", orderId)


        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Data processed successfully"})
        };
    } catch (error) {
        console.error('Error processing data:', error.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message })
        };
    } finally {
        isExecuting = false;
    }
};
