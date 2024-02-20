const fetch = require("node-fetch");
require("dotenv").config();

exports.handler = async (event, context) => {
    const getNetlifyKey = event.queryStringParameters.API_KEY
    const getValidationKey = process.env.Netlify_API_KEY

    try{
        if (getNetlifyKey === getValidationKey) {
            if (event.httpMethod === "GET") {
                const BodyData = JSON.parse(event.body);
                const objectData = JSON.parse(BodyData.body)
                const fetchObjectId = objectData[0].objectId
                
                const fetchContact = async () => {
                    const hubspotContact = await fetch(`https://api.hubapi.com/contacts/v1/contact/vid/${fetchObjectId}/profile`, {
                        headers: {
                            "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                            "Content-Type": "application/json"
                        }
                    });

                    const hubsspotContactResponse = await hubspotContact.json()

                    const getProperties = hubsspotContactResponse.properties
                    const userData = {"firstname": getProperties.firstname.value, "lastname": getProperties.lastname.value, "email": getProperties.email.value}
                    console.log("RESPONSE", userData)
                }

                fetchContact();
            }
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "UnAuthorized Access"})
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Access Authorized" }),
        }
    }catch(error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message})
        }
    }
   
};
