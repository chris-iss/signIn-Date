const fetch = require("node-fetch");
require('dotenv').config()


exports.handler = async (event, context) => {
    //Get API Key and confirms if it's correct before proceeding for Authentication
    const getHubspotApiKey = event.queryStringParameters.HUBSPOT_API_KEY
    const apikey = process.env.HUBSPOT_API_KEY;

    if (getHubspotApiKey === apikey) {
        console.log("E MATCH")
    } else {
        console.log("E NO MATCH")
    }

    const url = "https://api.hubapi.com/crm/v3/objects/contacts";

    try {
      const getJokes = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            'AUTHORIZATION': `Bearer ${apikey}`
        },
        params: {
            properties: 'Thinkific_Enrolment_Id'
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
