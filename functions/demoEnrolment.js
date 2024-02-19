const fetch = require("node-fetch")
require("dotenv").config();

exports.handle = async (event, context) => {
    const getNetlifyKey = event.queryStringParameters.API_KEY
    const getValidationKey = process.env.Netlify_API_KEY

    if (getNetlifyKey === getValidationKey) {
        return {
            statusCode: 200,
            body: JSON.stringify({message: "Success"})
        }
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({message: "Failed"})
        }
    }
}