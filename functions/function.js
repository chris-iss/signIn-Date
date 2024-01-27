// Import the 'node-fetch' library for making HTTP requests
const fetch = require("node-fetch");

// Netlify serverless function entry point
exports.handler = async (event, context) => {
    // Extract the API key from the query parameters of the request
    const getNetlifyKey = event.queryStringParameters.API_KEY;
    
    // Retrieve the validation key from environment variables
    const validationKey = process.env.Netlify_API_KEY;

    // Check if the provided API key matches the expected validation key
    if (getNetlifyKey === validationKey) {
        // Function to update Thinkific access date property for a HubSpot contact
        const updateThinkificAccessDateProperty = async (contactId, firstSignDate, expiryDate) => {
            // Format the expiry and sign dates to ISO strings without time information
            const formatExpiryDate = expiryDate.toISOString().split("T")[0];
            const formatSignDate = new Date(firstSignDate).toISOString().split("T")[0];

            // Define the properties object for updating HubSpot contact
            const thinkificSignDateProperty = {
                "properties": {
                    "thinkific_access_date": formatSignDate,
                    "thinikific_user_expirydate": formatExpiryDate
                }  
            };

            // Make a PATCH request to update the HubSpot contact
            const updateContact = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(thinkificSignDateProperty)
            });

            // Parse the response and log it
            const response = await updateContact.json();
            console.log("RESOLVE PROMISE", response);
        };

        // Function to search for a HubSpot contact using Thinkific email
        const hubspotSearchContact = async () => {
            // HubSpot API base URL for contact search
            const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

            // Parse the request body to extract parameters
            const extractParameteres =  JSON.parse(event.body);
            const fetchThinkificEmail = extractParameteres.payload.email;
            const firstSignDate = extractParameteres.created_at;

            try {
                // Define properties for searching HubSpot contacts by email
                const hubspotSearchProperties = {
                    after: "0",
                    filterGroups: [
                        { filters: [{ operator: "EQ", propertyName: "email", value: fetchThinkificEmail }] },
                        { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: fetchThinkificEmail }] },
                    ],
                    limit: "100",
                    properties: ["email", "thinkific_access_date", "id"], // Include id for updating
                    sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
                };

                // Make a POST request to search for HubSpot contacts
                const searchContact = await fetch(hubspotBaseURL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(hubspotSearchProperties),
                });

                // Parse the response from HubSpot contact search by email
                const hubspotContactResponse = await searchContact.json();

                // Extract relevant information from the HubSpot response
                const extractHubspotUserId = hubspotContactResponse.results[0].properties.hs_object_id;
                const extractThinkificAccessDate = hubspotContactResponse.results[0].properties.thinkific_access_date;

                let expiryDate;

                // Calculate the Thinkific expiry date and update it on HubSpot contact property
                if (firstSignDate && !isNaN(new Date(firstSignDate))) {
                    const startedAtDate = new Date(firstSignDate);

                    if (!isNaN(startedAtDate)) {
                        expiryDate = new Date(firstSignDate);
                        expiryDate.setMonth(startedAtDate.getMonth() + 12);
                    }
                }

                // If Thinkific access date is empty or null, update the property
                if (extractThinkificAccessDate === "" || extractThinkificAccessDate === null) {
                    await updateThinkificAccessDateProperty(extractHubspotUserId, firstSignDate, expiryDate);
                }
            } catch (error) {
                // Log any errors during the HubSpot contact search
                console.log("HUBSPOT SEARCH ERROR", error.message);
            }
        };

        // Invoke the function to search for and update HubSpot contacts
        await hubspotSearchContact();

        // Return a success response
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Success!'
            })
        };
    } else {
        // Return an unauthorized access response
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: "UNAUTHORIZED ACCESS"
            })
        };
    }
};
