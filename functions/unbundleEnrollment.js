const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

exports.handler = async (event) => {
    
    if (isExecuting) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "Function is already executing"})
        }
    }

    isExecuting = true;

   try {
    const getNetlifyKey = event.queryStringParameters.API_KEY;
    const getValidationKey = process.env.Netlify_API_KEY;

    if (getNetlifyKey === getValidationKey) {
        const extractParameteres = JSON.parse(event.body);
        let enrolUserId;


        // Split the comma-separated strings into arrays
        const emails = extractParameteres.email.split(',');
        const firstnames = extractParameteres.firstname.split(',');
        const lastnames = extractParameteres.lastname.split(',');

        // Array to hold participant information
        const participantInfo = [];

        // Iterate over the arrays and construct participant objects
        for (let i = 0; i < emails.length; i++) {
            const email = emails[i].trim();
            const firstname = firstnames[i].trim();
            const lastname = lastnames[i].trim();
            // Push each participant's data into participantInfo array
            participantInfo.push({ firstName: firstname, lastName: lastname, email: email });
        }
        
        // Simulating a loop over participantInfo (replace with actual loop logic)
        participantInfo.forEach((participant, index) => {
            console.log(`Loop Iteration: ${index + 1}`);
            console.log(`Firstname: ${participant.firstName}`);
            console.log(`Lastname: ${participant.lastName}`);
            console.log(`Email: ${participant.email}`);
            console.log("---");
        });

       
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Access Granted"})
        }
    } else {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "Authorized Access"})
        }
    }
   } catch(error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message})
        };
   } finally {
        isExecuting = false;
   }
}