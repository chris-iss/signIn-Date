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

        const consumerKey = `${process.env.CONSUMERKEY}`; // Replace with your WooCommerce consumer key
        const consumerSecret = `${process.env.CONSUMERSECRET}`; // Replace with your WooCommerce consumer secret
        const baseUrl = 'https://www.stg.instituteofsustainabilitystudies.com/wp-json/wc/v3/orders';

        const getOrderDetails = async (orderId) => {
            const url = `${baseUrl}/${orderId}`;
            const auth = 'Basic ' + Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': auth
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error fetching order details: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Order Details:', data);
                return data;
            } catch (error) {
                console.error(error.message);
                return null;
            }
        };
        getOrderDetails(orderId);


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
