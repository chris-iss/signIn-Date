const fetch = require("node-fetch");
require("dotenv").config();

exports.handler = async (event, context) => {
    try {
        const netlifyKey = event.queryStringParameters.API_KEY
        const getNetlifyKey = process.env.Netlify_API_KEY;
        const requestBody = JSON.parse(event.body);
        let payload = requestBody.payload


        if (netlifyKey === getNetlifyKey && payload.product_name === "Demo - Diploma in Business Sustainability") {

            // Step 1: Submit Data to Hubspot Demo Form
            const formSubmission = async () => {
                try {
                    const formData = {
                        submittedAt: Date.now(), 
                        fields: [
                            { name: "firstname", value: payload.user.first_name },
                            { name: "lastname", value: payload.user.last_name },
                            { name: "email", value: payload.user.email },
                            { name: "phone", value: "0899765434" }
                        ],
                        context: {
                            hutk: `${process.env.HUBSPOTUTK}`, 
                            pageUri: "https://instituteofsustainabilitystudies.com",
                            pageName: "Business & Corporate Sustainability Training Courses | ISS"
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
                    await sendErrorTooZapierWebhook(payload.user.first_name, payload.user.last_name, error.message);

                    throw new Error(`Error creating or updating contact in HubSpot: ${error.message}`);
                }
            }
            await formSubmission();


            // Step 2: Create or Update Contact and Demo Taken
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
                        await sendErrorTooZapierWebhook(payload.user.first_name, payload.user.last_name, error.message);

                        throw new Error(`Error submitting data to HubSpot Demo Form: ${error.message}`);
                    }
                }
                await creactHubspotContact();

                // Step 3: Send Errors to Huspot Webhook
                const sendErrorTooZapierWebhook = async (first_name, last_name, error) => {
                    const sendNotificcation = await fetch(`${process.env.DEMOERRORWEBHOOK}`, {
                        method: "POST",
                        body: JSON.stringify({ firstname: first_name, lastname: last_name, message: error})
                    });

                    return sendNotificcation.json();
                };

            
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
        await sendErrorToZapierWebhook(payload.user.first_name, payload.user.last_name, error.message); 
              
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message})
        }
    }
}