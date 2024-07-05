const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

// These are course product Id's
const thinkificProductIdMap = {
    "2965465": "unbundled_module_1_course_id",
    "2965473": "unbundled_module_2_course_id",
    "2965479": "unbundled_module_3_course_id",
    "2965489": "unbundled_module_4_course_id",
    "2965499": "unbundled_module_5_course_id",
    "2965518": "unbundled_module_6_course_id",
    "2965523": "unbundled_module_7_course_id",
    "2755272": "unbundled_module_8_course_id",
    "2965534": "unbundled_module_9_course_id",
    "2965541": "unbundled_module_10_course_id",
    "2965546": "unbundled_module_11_course_id",
    "2965548": "unbundled_module_12_course_id",
    "2937008": "unbundled_csrd_product_id",
    "2822347": "bs_diploma_course_id"
};

// This codebase Thinkific Product ID in real-time and updates Produc id HubSpot propertIESS
exports.handler = async (event) => {
    try {
        // Check if the function is already executing
        if (isExecuting) {
            return {
                statusCode: 409,
                body: JSON.stringify({ message: "Function is already executing" })
            };
        }

        isExecuting = true;

        const getNetlifyKey = event.queryStringParameters && event.queryStringParameters.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;
        const extractParameters = JSON.parse(event.body);

        console.log("Request Body:", extractParameters);

        // Validate API key
        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        const { email, responseDataId } = extractParameters;

        // Check if responseDataId matches any productId in thinkificProductIdMap
        const contactPropertyToUpdate = thinkificProductIdMap[responseDataId];
        if (!contactPropertyToUpdate) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid product ID" })
            };
        }

        // Search for the Contact on HubSpot
        const hubspotSearchContact = async () => {
            const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

            try {
                // Define properties for searching HubSpot contacts by email
                const hubspotSearchProperties = {
                    filterGroups: [
                        { filters: [{ operator: "EQ", propertyName: "email", value: email }] },
                        { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: email }] },
                    ],
                    limit: 100,
                    properties: [
                        "id",
                        "email",
                        contactPropertyToUpdate // Include contact property to update
                    ],
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
                if (!hubspotContactResponse.results.length) {
                    throw new Error("No contact found");
                }

                const extractHubspotUserId = hubspotContactResponse.results[0].id;

                // Update Unbundled Product ID Contact Property
                const updateCoursePrdId = async () => {
                    try {
                        // Define the properties object for updating HubSpot contact
                        const unbundledProductIdProperty = {};
                        unbundledProductIdProperty[contactPropertyToUpdate] = `${responseDataId}`;

                        // Make a PATCH request to update the HubSpot contact
                        const updateContact = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${extractHubspotUserId}`, {
                            method: "PATCH",
                            headers: {
                                Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ properties: unbundledProductIdProperty })
                        });

                        // Parse the response and log it
                        const response = await updateContact.json();
                        console.log("Course Product Id Updated:", response);

                    } catch (error) {
                        // Log any errors during the HubSpot contact update
                        console.log("Error updating module completion:", error.message);
                    }
                };

                await updateCoursePrdId();
            } catch (error) {
                // Log any errors during the HubSpot contact search
                console.log("HUBSPOT SEARCH ERROR", error.message);
            }
        };

        await hubspotSearchContact();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success" })
        };
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message })
        };
    } finally {
        isExecuting = false;
    }
};
