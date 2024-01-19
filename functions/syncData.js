const fetch = require("node-fetch");
require('dotenv').config()


exports.handler = async (event, context) => {
    const url = "https://api.hubapi.com/crm/v3/objects/contacts";
    const apikey = process.env.API_KEY;

    try {
      const getJokes = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            'AUTHORIZATION': `Bearer ${apikey}`
        }
      });

      const jsonJoke = await getJokes.json();
      return {
        statusCode: 200,
        body: JSON.stringify(jsonJoke)
      }

    } catch (error) {
        console.log(error.message)
        return {
            statusCode: 422,
            body: error.message
        }
    }
};
