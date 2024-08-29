// Import the 'node-fetch' library for making HTTP requests
const fetch = require("node-fetch");

// Load environment variables from a '.env' file
require("dotenv").config();

// Netlify serverless function entry point
exports.handler = async (event, context) => {
  // Extract the API key from the query parameters of the request
  const getNetlifyKey = event.queryStringParameters.API_KEY;

  // Retrieve the validation key from environment variables
  const validationKey = process.env.Netlify_API_KEY;

  // Parse the request body to extract parameters
  const extractParameteres = JSON.parse(event.body);
  const extractCourseName = extractParameteres.payload.course.name;

  // Check if the provided API key matches the expected validation key
  if (getNetlifyKey === validationKey) {
    // Function to update HubSpot contact with Thinkific last activity date
    const updateThinkificLastActivityDateProperty = async (contactId, lastActivityDate) => {
      // Initialize the last activity date property based on the course name
      let lastActivity_DateProperty;

      if (extractCourseName === "Diploma in Business Sustainability") {
        lastActivity_DateProperty = {
          properties: {
            thinkific_diploma_last_activity_date: lastActivityDate,
          },
        };
      } else if (extractCourseName === "Certificate in Business Sustainability") {
        lastActivity_DateProperty = {
          properties: {
            thinkific_diploma_last_activity_date: lastActivityDate,
          },
        };
      }

      // Make a PATCH request to update the HubSpot contact
      const updateContact = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lastActivity_DateProperty),
      });

      // Parse the response and log it
      const response = await updateContact.json();
      console.log("HUBSPOT LAST_ACTIVE RESPONSE", response);
    };

    // Function to search for a HubSpot contact using Thinkific email
    const hubspotSearchContact = async () => {
      // Extract Thinkific user email and created_at date
      const extractThinkificEmail = extractParameteres.payload.user.email;
      const lastActivityDate = new Date(extractParameteres.created_at);
      const formattedLastActiveDate = lastActivityDate.toISOString().split("T")[0];

      // HubSpot API base URL for contact search
      const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

      try {
        // Define properties for searching HubSpot contacts by email
        const hubspotSearchProperties = {
          after: "0",
          filterGroups: [
            { filters: [{ operator: "EQ", propertyName: "email", value: extractThinkificEmail }] },
            { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: extractThinkificEmail }] },
          ],
          limit: "100",
          properties: ["email", "thinkific_diploma_last_activity_date", "id"], // Include id for updating
          sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
        };

        // Make a POST request to search for HubSpot contacts
        const searchContact = await fetch(`${hubspotBaseURL}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(hubspotSearchProperties),
        });

        // Response from HubSpot contact search by email
        const hubspotContactResponse = await searchContact.json();

        // Extract relevant information from the HubSpot response
        const extractHubspotUserId = hubspotContactResponse.results[0].properties.hs_object_id;

        // Update Thinkific last activity date for the HubSpot contact
        await updateThinkificLastActivityDateProperty(extractHubspotUserId, formattedLastActiveDate);

        // Return a success response
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Search was Successful",
          }),
        };
      } catch (error) {
        // Return an error response if the search encounters an issue
        return {
          statusCode: 422,
          body: JSON.stringify({
            message: error.message,
          }),
        };
      }
    };

    // Invoke the function to search for and update HubSpot contacts
    await hubspotSearchContact();

    // Return a success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
      }),
    };
  } else {
    // Return an unauthorized access response
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "UNAUTHORIZED ACCESS",
      }),
    };
  }
};
