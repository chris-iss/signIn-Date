const fetch = require("node-fetch");

require("dotenv").config();

exports.handler = async (event, context) => {
    const getNetlifyKey = event.queryStringParameters.API_KEY
    const getParamters = JSON.parse(event.body)

    console.log("NetlifyKey:", getNetlifyKey)
}