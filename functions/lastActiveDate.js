const fetch = require("node-fetch");
// require("dotenv").config();

exports.handler = async (event, context) => {
  const getNetlifyKey = event.queryStringParameters.API_KEY;
  const validationKey = process.env.Netlify_API_KEY;
  const extractParameteres = JSON.parse(event.body);
  const extractCourseName = extractParameteres.payload.course.name;

  if (getNetlifyKey === validationKey) {

    const hubspotSearchContact = async () => {
        const extractThinkificEmail = extractParameteres.payload.user.email;
        const lastActivityDate = new Date(extractParameteres.created_at);
        const formattedLastActiveDate = lastActivityDate.toISOString().split("T")[0];

        console.log("THIRD RUN")
        const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;
      try {
        const hubspotSearchProperties = {
            after: "0",
            filterGroups: [
              { filters: [{ operator: "EQ", propertyName: "email", value: extractThinkificEmail }] },
              { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: extractThinkificEmail}] },
            ],
            limit: "100",
            properties: ["email", "thinkific_diploma_last_activity_date", "id"], // Include id for updating
            sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
          };
        console.log("FOURTH RUN")

        const searchContact = await fetch(`${hubspotBaseURL}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(hubspotSearchProperties)
        });
        console.log("FIFTH RUN")

        // Response from hubspot contact search by email
        const hubspotContactResponse = await searchContact.json();
        console.log("SIXTH RUN")

        const extractHubspotUserId = hubspotContactResponse.results[0].properties.hs_object_id;

        await updateThinkificLastActivityDateProperty(extractHubspotUserId, formattedLastActiveDate);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Search was Successful"
            })
        }
      } catch (error) {
        return {
            statusCode: 422,
            body: JSON.stringify({
                message: error.message
            })
        }
      }
    };

    await hubspotSearchContact();

    const updateThinkificLastActivityDateProperty = async (contactId, lastActivityDate) => {
      let lastActivity_DateProperty;

      if (extractCourseName === "Diploma in Business Sustainability 2024") {
        lastActivity_DateProperty = {
          properties: {
            thinkific_diploma_last_activity_date: lastActivityDate,
          },
        };
      } else if (
        extractCourseName === "Certificate in Business Sustainability 2024"
      ) {
        lastActivity_DateProperty = {
          properties: {
            thinkific_diploma_last_activity_date: lastActivityDate,
          },
        };
      }

      const updateContact = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,{
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(lastActivity_DateProperty),
        }
      );

      const response = await updateContact.json();

      console.log("HUBSPOT LAST_ACTIVE RESPOPNSE", response);
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
      }),
    };
  } else {
    return {
        statusCode: 401,
        body: JSON.stringify({
            message: "UNAUTHORIZED ACCESS"
        })
    }
  }
};
