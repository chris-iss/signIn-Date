const fetch = require("node-fetch");
require("dotenv").config();

exports.handler = async (event, context) => {
    try {
        const netlifyKey = event.queryStringParameters.API_KEY
        const getNetlifyKey = process.env.Netlify_API_KEY;
        const requestBody = JSON.parse(event.body);
        let payload = requestBody.payload;
        let clientIpAddress = event.headers['x-forwarded-for'];

        console.log("COURSE-NAME:", payload.course.name);


        if (netlifyKey === getNetlifyKey && payload.course.name === "Preview - ISS Online Platform") {
            let userPhoneNumber;

            // Step 1: Functioon to extract user phone number
            const fetchUser = async () => {
                const getUserData = await fetch(`https://api.thinkific.com/api/public/v1/users/${payload.user.id}
                `, {
                    methhod: "GET",
                    headers: {
                        "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
                        "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
                        "Content-Type": "application/json",
                    },
                })

                if (!getUserData.ok) {
                    throw new Error(`Thinkific API Error: ${getUserData.status} - ${getUserData.statusText}`);
                }

                const getUserResponse = await getUserData.json();
                userPhoneNumber = getUserResponse.custom_profile_fields[0].value
            }
            await fetchUser();


            // Step 2: Submit Data to Hubspot Demo Form
            const formSubmission = async () => {
                try {
                    const formData = {
                        submittedAt: Date.now(), 
                        fields: [
                            { name: "firstname", value: payload.user.first_name },
                            { name: "lastname", value: payload.user.last_name },
                            { name: "email", value: payload.user.email },
                            { name: "phone", value: userPhoneNumber }
                        ],
                        context: {
                            hutk: `${process.env.HUBSPOTUTK}`, 
                            pageUri: "https://instituteofsustainabilitystudies.com",
                            pageName: "Business & Corporate Sustainability Training Courses | ISS",
                            ipAddress: clientIpAddress
                        },
                    };
                    
                    const submitData = await fetch(`https://api.hsforms.com/submissions/v3/integration/secure/submit/${process.env.HUBSPOT_PORTALID}/${process.env.HUBSPOT_FORMID}`, {
                        method: "POST",
                        headers: {
                            "AUTHORIZATION": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(formData)
                    });
    
                    return  await submitData.json();

                } catch(error) {
                    throw new Error(`Error creating or updating contact in HubSpot: ${error.message}`);
                }
            }
            await formSubmission();


            //Step 3: Create or Update Contact and Demo Taken
                const creactHubspotContact = async () => {
                    try {
                        const contactProperty = {
                            properties: [
                                { property: "firstname", value: payload.user.first_name },
                                { property: "lastname", value: payload.user.last_name },
                                { property: "email", value: payload.user.email },
                                { property: "demo_taken", value: true }
                            ]
                        };

                        const createContact = await fetch(`https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(payload.user.email)}`, {
                            method: "POST",
                            headers: {
                                "AUTHORIZATION": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(contactProperty)
                        });

                        return await createContact.json();

                    }catch(error) {
                        throw new Error(`Error submitting data to HubSpot Demo Form: ${error.message}`);
                    }
                }
                await creactHubspotContact();
            
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Successful"})
                }  
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access or Invalid Product Name" })
            };
        }      
    } catch(error) { 
              
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message})
        }
    }
}