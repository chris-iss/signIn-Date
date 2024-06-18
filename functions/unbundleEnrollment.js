const axios = require('axios');
require('dotenv').config();

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

        // Split comma-separated strings into arrays
        const emails = requestBody.email.split(',');
        const firstnames = requestBody.firsrtname.split(',');
        const lastnames = requestBody.lastname.split(',');

        // Array to hold participant information
        const participantInfo = [];

        // Function to create HubSpot contact
        async function createHubSpotContact(firstName, lastName, email) {
            try {
                const response = await axios.post(
                    `https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${email}/?hapikey=${process.env.HUBSPOT_API_KEY}`,
                    {
                        properties: [
                            { property: 'firstname', value: firstName },
                            { property: 'lastname', value: lastName },
                            { property: 'email', value: email }
                        ]
                    }
                );

                if (response.status === 200) {
                    console.log(`Contact created successfully for ${firstName} ${lastName}`);
                    return response.data;
                } else {
                    console.error(`Failed to create contact: ${response.statusText}`);
                    return null;
                }

            } catch (error) {
                console.error('Error creating HubSpot contact:', error.message);
                return null;
            }
        }

        // Iterate through participants and create HubSpot contacts
        for (let i = 0; i < emails.length; i++) {
            const trimmedEmail = emails[i].trim();
            const trimmedFirstname = firstnames[i].trim();
            const trimmedLastname = lastnames[i].trim();

            // Push each participant's data into participantInfo array
            participantInfo.push({ firstName: trimmedFirstname, lastName: trimmedLastname, email: trimmedEmail });

            // Create HubSpot contact
            await createHubSpotContact(trimmedFirstname, trimmedLastname, trimmedEmail);
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