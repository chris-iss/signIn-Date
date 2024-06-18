const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

exports.handler = async (event) => {
    
    if (isExecuting) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "Function is already executing"})
        }
    }

    isExecuting = true;

   try {
    const getNetlifyKey = event.queryStringParameters.API_KEY;
    const getValidationKey = process.env.Netlify_API_KEY;

    if (getNetlifyKey === getValidationKey) {
        const extractParameteres = JSON.parse(event.body);
        console.log("DATA-RESULT", extractParameteres)
        let enrolUserId;

       
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Access Granted"})
        }
    } else {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "Authorized Access"})
        }
    }
   } catch(error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message})
        };
   } finally {
        isExecuting = false;
   }
}