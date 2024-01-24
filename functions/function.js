const fetch = require("node-fetch");
// require("dotenv").config();

exports.handler = async (event, context) => {
    const getNetlifyKey = event.queryStringParameters.API_KEY;
    const validationKey = process.env.Netlify_API_KEY;

    if (getNetlifyKey === validationKey) {

        const hubspotSearchContact = async () => {
            const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;
            const extractParameteres =  JSON.parse(event.body)
            const fetchThinkificEmail = extractParameteres .payload.email
            const firstSignDate = extractParameteres.created_at

            console.log("FUNCTION RUN")
            try {
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

                  console.log("THIRD FUNCTION RUN")
          
                  const searchContact = await fetch(hubspotBaseURL, {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(hubspotSearchProperties),
                  });

                  console.log("FOURTH FUNCTION RUN")
        
                  
                  // Response from hubspot contact search by email
                  const hubspotContactResponse = await searchContact.json();

                  console.log("FIFTH FUNCTION RUN", hubspotContactResponse)
    
                  const extractHubspotUserId = hubspotContactResponse.results[0].properties.hs_object_id
                  const extractThinkificAccessDate = hubspotContactResponse.results[0].properties.thinkific_access_date
    
                  if (extractThinkificAccessDate === "") {
                    await updateThinkificAccessDateProperty(extractHubspotUserId, firstSignDate)
                  }
    
                  
            } catch (error) {
                console.log("HUBSPOT SEARCH ERROR", error.message )
            }   
        }
    
        hubspotSearchContact();
    
        const  updateThinkificAccessDateProperty = async (contactId, firstSignDate) => {
            const formatSignDate = new Date(firstSignDate).toISOString().split("T")[0]
    
            const thinkificSignDateProperty = {
                "properties": {
                    "thinkific_access_date": formatSignDate
                }  
            }
    
            const updateContact = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(thinkificSignDateProperty)
              });
    
              const response = await updateContact.json()
    
              console.log("RESOLVE PROMISE", response)
             
        }
    
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Success!'
            })
        };
    } else {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: "UNAUTHORIZED ACCESS"
            })
        }
    }
}