const fetch = require("node-fetch")
require("dotenv").config();

exports.handle = async function(event, context)  {
    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Hello World" }),
    };
}