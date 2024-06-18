const fetch = require("node-fetch");
require("dotenv").config();


let isExecuting = false;

exports.handler = async (event) => {
    if (isExecuting) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "Function is already executing"})
        };
    }

    isExecuting = true;

    try {
        const getNetlifyKey = event.queryStringParameters.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;

        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access"})
            };
        }

        const requestBody = JSON.parse(event.body);
        const emails = requestBody.email.split(',');
        const firstnames = requestBody.firsrtname.split(',');
        const lastnames = requestBody.lastname.split(',');

        const participantInfo = [];

        async function createHubSpotContact(firstName, lastName, email) {
            const url = `https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(email)}`;

            const requestOptions = {
                method: 'POST',
                headers: {
                     "AUTHORIZATION": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                     "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    properties: [
                        { property: 'firstname', value: firstName },
                        { property: 'lastname', value: lastName },
                        { property: 'email', value: email }
                    ]
                })
            };

            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to create HubSpot contact: ${response.status} - ${errorData.message}`);
            }

            const data = await response.json();
            console.log(`Contact created successfully for ${firstName} ${lastName}`);
            return data;
        }

        for (let i = 0; i < emails.length; i++) {
            const trimmedEmail = emails[i].trim();
            const trimmedFirstname = firstnames[i].trim();
            const trimmedLastname = lastnames[i].trim();

            participantInfo.push({ firstName: trimmedFirstname, lastName: trimmedLastname, email: trimmedEmail });

            try {
                await createHubSpotContact(trimmedFirstname, trimmedLastname, trimmedEmail);
            } catch (error) {
                console.error('Error creating HubSpot contact:', error.message);
                // Optionally handle or log the error here
            }
        }
        
        console.log("Processed participantInfo:", participantInfo);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Data processed successfully", participantInfo })
        };
    } catch(error) {
        console.error('Error processing data:', error.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing or invalid request body" })
        };
    } finally {
        isExecuting = false;
    }
};




