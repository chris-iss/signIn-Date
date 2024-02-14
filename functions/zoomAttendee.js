const fetch = require("node-fetch"); // Imports the node-fetch module for making HTTP requests
require("dotenv").config(); // Loads environment variables from a .env file into process.env

exports.handler = async (event, context) => { // Defines an async function as the handler for the Netlify function
  const getNetlifyKey = event.queryStringParameters.API_KEY; // Retrieves the API_KEY parameter from the request query string
  const getValidationKey = process.env.Netlify_API_KEY; // Retrieves the validation API key from environment variables

  if (getNetlifyKey === getValidationKey) { // Checks if the provided API key matches the validation key
    const fetchZoomData = JSON.parse(event.body); // Parses the request body JSON data
    const participantEmaiil = fetchZoomData.payload.object.participant.email; // Extracts the email of the participant from the Zoom data
    const attendanceDate = fetchZoomData.payload.object.participant.join_time; // Extracts the join time of the participant from the Zoom data

    const formatAttendanceDate = new Date(attendanceDate); // Converts the join time string to a Date object
    const zoomAttendanceDate = formatAttendanceDate.toISOString().split("T")[0]; // Formats the Date object to ISO string and extracts the date


    // Step 2
    const updateUserZoomAttendanceProperty = async (hubspot_userId, zoomAttendance) => { // Defines an async function to update the HubSpot contact's Zoom attendance property
       
      let userZoomAttendee; // Initializes a variable to hold the data for updating HubSpot contact property

      if (zoomAttendance === null || zoomAttendance === "" || zoomAttendance === undefined || zoomAttendance === "Yes") { // Checks if the Zoom attendance is null or already set to "Yes"
          userZoomAttendee = { // Constructs the data object for updating HubSpot contact property
              properties: {
                  zoom_participant_attendance: "Yes", // Sets the Zoom participant attendance property to "Yes"
                  zoom_attendance_date: zoomAttendanceDate // Sets the Zoom attendance date property
              }
          }
      }

      const updateProperty = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${hubspot_userId}`, { // Makes a PATCH request to update HubSpot contact property
          method: "PATCH",
          headers: {
              "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`, // Includes authorization token in the request headers
              "Content-Type": "application/json",
          },
          body: JSON.stringify(userZoomAttendee) // Converts the data object to JSON string for the request body
      })

      const hubspottUpdateResponse = await updateProperty.json(); // Parses the response JSON data
      console.log("UPDATED", hubspottUpdateResponse); // Logs the update response
    };



    //Step 1: Make a POST request to search for HubSpot contacts
    const searchContact = async () => { // Defines an async function to search for HubSpot contacts
      try {

        // Define properties for searching HubSpot contacts by email
        const hubspotSearchProperties = {
            after: "0",
            filterGroups: [
              { filters: [{ operator: "EQ", propertyName: "email", value: participantEmaiil }] },
              { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: participantEmaiil }] },
            ],
            limit: "100",
            properties: ["email", "zoom_participant_attendance", "id"], // Include id for updating
            sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
        };
 
        // Make a POST request to search for HubSpot contacts
        const executeSearch = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", { // Makes a POST request to search for HubSpot contacts
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`, // Includes authorization token in the request headers
                "Content-Type": "application/json",
            },
            body: JSON.stringify(hubspotSearchProperties) // Converts the search properties to JSON string for the request body
        });

        const searchResult = await executeSearch.json(); // Parses the search result JSON data
        const hubspot_userId = searchResult.results[0].properties.hs_object_id; // Retrieves the HubSpot contact's ID from the search result
        const hubspot_userEmail = searchResult.results[0].properties.email; // Retrieves the HubSpot contact's email from the search result
        const zoomAttendance = searchResult.results[0].properties.zoom_participant_attendance; // Retrieves the HubSpot contact's Zoom attendance property from the search result

        if (hubspot_userEmail === participantEmaiil) { // Checks if the retrieved email matches the participant's email
            await updateUserZoomAttendanceProperty(hubspot_userId, zoomAttendance); // Calls the function to update HubSpot contact property
        }
       
      } catch (error) { // Handles errors that occur during the search process
        return {
          statusCode: 400, // Sets the status code for the error response
          message: error.message, // Includes the error message in the response body
        };
      }
    };

    await searchContact(); // Executes the function to search for HubSpot contacts

    // Prepare the HTTP response
    const response = {
      statusCode: 200, // Sets the status code for the response to OK
      body: JSON.stringify({ message: "Received API_KEY successfully." }), // Converts the response message to JSON string
    };

    return response; // Returns the HTTP response
  }
};
