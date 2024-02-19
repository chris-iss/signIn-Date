const fetch = require("node-fetch");
require("dotenv").config();

exports.handler = async (event, context) => {
    console.log(event);
    // try { 
    //     return {
    //         statusCode: 200,
    //         body: JSON.stringify({ message: "Hello World, W WORK" }),
    //     };

    // } catch(error) {
    //     console.error(error);
    //     return {
    //         statusCode: 400,
    //         body: JSON.stringify({ message: error.message }),
    //     };
    // }
};
