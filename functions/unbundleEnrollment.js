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
        const getNetlifyKey = event.queryStringParameters.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;

        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        const requestBody = JSON.parse(event.body);

        // Assuming requestBody contains the data like email, firstname, lastname
        const { email, firstname, lastname } = requestBody;

        // Split the comma-separated strings into arrays
        const emails = email.split(',');
        const firstnames = firstname.split(',');
        const lastnames = lastname.split(',');

        // Array to hold participant information
        const participantInfo = [];

        // Assuming emails, firstnames, and lastnames arrays are of the same length
        for (let i = 0; i < emails.length; i++) {
            const trimmedEmail = emails[i].trim();
            const trimmedFirstname = firstnames[i].trim();
            const trimmedLastname = lastnames[i].trim();
            // Push each participant's data into participantInfo array
            participantInfo.push({ firstName: trimmedFirstname, lastName: trimmedLastname, email: trimmedEmail });
        }

        console.log("Processed participantInfo:", participantInfo);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Data processed successfully", participantInfo })
        };
    } catch(error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message })
        };
    } finally {
        isExecuting = false;
    }
};







