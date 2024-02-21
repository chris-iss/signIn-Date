const fetch = require("node-fetch");
require("dotenv").config();

exports.handler = async (event, context) => {
  const getNetlifyKey = event.queryStringParameters.API_KEY;
  const getValidationKey = process.env.Netlify_API_KEY;

  if (getNetlifyKey === getValidationKey) {
    console.log("EVENT BODY:", event.body)
    const fetchZoomData = JSON.parse(event.body);
    const participantEmaiil = fetchZoomData.payload.object.participant.email;
    const attendanceDate = fetchZoomData.payload.object.participant.join_time;
    const typeOfMeeting = fetchZoomData.payload.object.topic


    const formatAttendanceDate = new Date(attendanceDate);
    const infoSessionAttendanceDate = formatAttendanceDate.toISOString().split("T")[0];

    const updateUserZoomAttendanceProperty = async (hubspot_userId, zoomAttendance, infoSessionAttendance) => {

      let userZoomAttendee;
      let userInfoSessionAttendance

      if (typeOfMeeting === "ISS Online Information Session") {
        if (infoSessionAttendance === null || infoSessionAttendance === "" || infoSessionAttendance === undefined || infoSessionAttendance === "Yes") {
            userInfoSessionAttendance = {
                properties: {
                    information_session_attendance: "Yes",
                    info_session_attendance_date: infoSessionAttendanceDate
                }
            }
        }
      } else {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: "Forbidden: Zoom event topic condition was not met"})
        }
      }

      const updateProperty = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${hubspot_userId}`, {
          method: "PATCH",
          headers: {
              "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
              "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfoSessionAttendance)
      })

      const hubspottUpdateResponse = await updateProperty.json();
      console.log("INFO SESSION ATTENDANCE UPDATED:", hubspottUpdateResponse);
    };

    const searchContact = async () => {
      try {

        const hubspotSearchProperties = {
            after: "0",
            filterGroups: [
              { filters: [{ operator: "EQ", propertyName: "email", value: participantEmaiil }] },
              { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: participantEmaiil }] },
            ],
            limit: "100",
            properties: ["email", "zoom_participant_attendance", "information_session_attendance", "id"],
            sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
        };
 
        const executeSearch = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(hubspotSearchProperties)
        });

        const searchResult = await executeSearch.json();
        const hubspot_userId = searchResult.results[0].properties.hs_object_id;
        const hubspot_userEmail = searchResult.results[0].properties.email;
        const zoomAttendance = searchResult.results[0].properties.zoom_participant_attendance;
        const infoSessioonAttendance = searchResult.results[0].properties.information_session_attendance;

        if (hubspot_userEmail === participantEmaiil) {
            await updateUserZoomAttendanceProperty(hubspot_userId, zoomAttendance, infoSessioonAttendance);
        }
       
      } catch (error) {
        return {
          statusCode: 400,
          message: error.message,
        };
      }
    };

    await searchContact();

    const response = {
      statusCode: 200,
      body: JSON.stringify({ message: "Received API_KEY successfully." }),
    };

    return response;
  }
};
