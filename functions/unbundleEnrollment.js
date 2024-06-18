const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

exports.handler = async (event) => {
    if (isExecuting) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "Function is already executing" })
        };
    }

    isExecuting = true;

    try {
        const getNetlifyKey = event.queryStringParameters && event.queryStringParameters.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;

        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        console.log("Event Body:", event.body); // Log the event body for debugging
        const requestBody = JSON.parse(event.body);

        if (!requestBody.email || !requestBody.firstname || !requestBody.lastname || !requestBody.currency || !requestBody.startdate) {
            throw new Error("Missing required fields in the request body");
        }

        const emails = requestBody.email.split(',');
        const firstnames = requestBody.firstname.split(',');
        const lastnames = requestBody.lastname.split(',');
        let currency = requestBody.currency;
        let startDate = requestBody.startdate;

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

                const sendResponseToZapier = await fetch('https://hooks.zapier.com/hooks/catch/14129819/2onxbma/', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email: trimmedEmail, currency: currency, startDate: startDate })
                });

                if (!sendResponseToZapier.ok) {
                    const zapierErrorData = await sendResponseToZapier.json();
                    throw new Error(`Failed to send data to Zapier: ${sendResponseToZapier.status} - ${zapierErrorData.message}`);
                }
            } catch (error) {
                console.error('Error creating HubSpot contact or sending data to Zapier:', error.message);
            }
        }

        console.log("Processed participantInfo:", participantInfo);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Data processed successfully", participantInfo })
        };
    } catch (error) {
        console.error('Error processing data:', error.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message })
        };
    } finally {
        isExecuting = false;
    }
};
