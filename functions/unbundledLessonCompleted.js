const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

// This codebase receives survey lesson completion in real-time and updates the HubSpot property to trigger Cert generation
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

        const courseWrapUp = [
            "Business Sustainability End-of-Course Survey",
            "Sustainability Plan Development End-of-Course Survey",
            "Sustainability Plan Implementation End-of-Course Survey",
            "Decarbonisation End-of-Course Survey",
            "Circular Economy and Sustainable Products End-of-Course Survey",
            "Business with Biodiversity End-of-Course Survey",
            "DEI End-of-Course Survey",
            "Sustainable Finance End-of-Course Survey",
            "Sustainable Operations End-of-Course Survey",
            "Supply Chain End-of-Course Survey",
            "Green Marketing End-of-Course Survey",
            "ESG Reporting and Auditing End-of-Course Survey",
            "CSRD End-of-Course Survey"
        ];

        const getNetlifyKey = event.queryStringParameters && event.queryStringParameters.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;
        const extractParameters = JSON.parse(event.body);
        const extractLessonName = extractParameters?.payload?.lesson?.name;
        const getUser = extractParameters?.payload?.user;
        const courseCompleted = extractParameters?.action;

        console.log("LESSON NAME:", extractLessonName);

        // Validate API key
        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        for (let surveyName of courseWrapUp) {
            if (extractLessonName === surveyName) {
                const capitalizedCourseCompleted = "Complete";
                console.log("Course matched:", surveyName);

                // Define the contact property to update based on the course name
                let contactPropertyToUpdate;
                switch (surveyName) {
                    case "Business Sustainability End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_1";
                        break;
                    case "Sustainability Plan Development End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_2";
                        break;
                    case "Sustainability Plan Implementation End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_3";
                        break;
                    case "Decarbonisation End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_4";
                        break;
                    case "Circular Economy and Sustainable Products End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_5";
                        break;
                    case "Business with Biodiversity End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_6";
                        break;
                    case "DEI End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_7";
                        break;
                    case "Sustainable Finance End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_8";
                        break;
                    case "Sustainable Operations End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_9";
                        break;
                    case "Supply Chain End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_10";
                        break;
                    case "Green Marketing End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_11";
                        break;
                    case "ESG Reporting and Auditing End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_module_12";
                        break;
                    case "CSRD End-of-Course Survey":
                        contactPropertyToUpdate = "unbundled_csrd";
                        break;
                    default:
                        console.log("No contact property defined for:", surveyName);
                        continue;
                }

                console.log("Updating property:", contactPropertyToUpdate, "for user:", getUser.email);

                // Search for the Contact on HubSpot
                const hubspotSearchContact = async () => {
                    const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

                    try {
                        const hubspotSearchProperties = {
                            after: "0",
                            filterGroups: [
                                { filters: [{ operator: "EQ", propertyName: "email", value: getUser.email }] },
                                { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: getUser.email }] },
                            ],
                            limit: "100",
                            properties: [
                                "id",
                                "email",
                                contactPropertyToUpdate // Include contact property to update
                            ],
                            sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
                        };

                        const searchContact = await fetch(hubspotBaseURL, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(hubspotSearchProperties),
                        });

                        const hubspotContactResponse = await searchContact.json();

                        if (!hubspotContactResponse.results || hubspotContactResponse.results.length === 0) {
                            console.log("No contact found for email:", getUser.email);
                            return;
                        }

                        const extractHubspotUserId = hubspotContactResponse.results[0].id;

                        const updateModuleCompletion = async () => {
                            try {
                                const moduleCompletionProperties = {};
                                moduleCompletionProperties[contactPropertyToUpdate] = capitalizedCourseCompleted;

                                const updateContact = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${extractHubspotUserId}`, {
                                    method: "PATCH",
                                    headers: {
                                        Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ properties: moduleCompletionProperties })
                                });

                                const response = await updateContact.json();
                                console.log("Module Completion Updated:", response);

                                const sendResponseToZapier = await fetch('https://hooks.zapier.com/hooks/catch/14129819/2u3ts5t/', {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({ id: response.id, updatedProperty: contactPropertyToUpdate, firstname: getUser?.first_name, lastname: getUser?.last_name, email: getUser?.email, lessonCompleted: extractParameters?.payload?.lesson?.name })
                                });

                                const sendResponseToZapier2 = await fetch('https://hooks.zapier.com/hooks/catch/14129819/3j1lp6r/', {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({ id: response.id, updatedProperty: contactPropertyToUpdate, firstname: getUser?.first_name, lastname: getUser?.last_name, email: getUser?.email, lessonCompleted: extractParameters?.payload?.lesson?.name })
                                });

                                console.log("Responses sent to Zapier");

                            } catch (error) {
                                console.log("Error updating module completion:", error.message);
                            }
                        };

                        await updateModuleCompletion();
                    } catch (error) {
                        console.log("HUBSPOT SEARCH ERROR:", error.message);
                    }
                };

                await hubspotSearchContact();
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success" })
        };
    } catch (error) {
        console.log("Error in main handler:", error.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message })
        };
    } finally {
        isExecuting = false;
    }
};
