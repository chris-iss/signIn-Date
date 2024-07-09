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

const coursesMap = [
    "Introduction to Business Sustainability",
    "Sustainability Plan Development",
    "Sustainability Plan Implementation",
    "Decarbonisation: Achieving Net Zero",
    "Circular Economy",
    "Business with Biodiversity",
    "Diversity, Equity, and Inclusion",
    "Sustainable Finance",
    "Sustainable Operations",
    "Sustainable Supply Chain",
    "Green Marketing",
    "ESG Reporting and Auditing",
    "Corporate Sustainability Reporting Directive - (CSRD)",
    "Diploma in Business Sustainability 2024"
];

// This codebase Thinkific Product ID in real-time and updates Product id HubSpot properties
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

        const { email, responseDataId, coursesSelected } = extractParameters;

        console.log("COURSES SELECTED:", coursesSelected);
        console.log("COURSE-SELECTED: - TYPEOF OF DATA", typeof (coursesSelected));

        const selectedCoursesData = coursesSelected.split(",");

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
                        contactPropertyToUpdate // Include contact property to updates
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

                // NEW CODE TO UPDATE SPECIFIED HUBSPOT CONTACT PROPERTY BASED ON SELECTED COURSES
                
                const selectedCoursesArray = coursesSelected.split(",");
                const matchedCourses = [];

                for (let course of coursesMap) {
                    if (selectedCoursesArray.includes(course)) {
                        const enrolled = "Enrolled";
                        let updateContactProperty;
                        switch(course) {
                            case "Introduction to Business Sustainability":
                                updateContactProperty = "unbundled_module_1";
                                break;
                            case "Sustainable Plan Development":
                                updateContactProperty = "unbundled_module_2";
                                break;
                            case "Sustainability Plan Implementation":
                                updateContactProperty = "unbundled_module_3";
                                break;
                            case "Decarbonisation: Achieving Net Zero":
                                updateContactProperty = "unbundled_module_4";
                                break;
                            case "Circular Economy":
                                updateContactProperty = "unbundled_module_5";
                                break;
                            case "Business with Biodiversity":
                                updateContactProperty = "unbundled_module_6";
                                break;
                            case "Diversity, Equity, and Inclusion":
                                updateContactProperty = "unbundled_module_7";
                                break;
                            case "Sustainable Finance":
                                updateContactProperty = "unbundled_module_8";
                                break;
                            case "Sustainable Operations":
                                updateContactProperty = "unbundled_module_9";
                                break;
                            case "Sustainable Supply Chain":
                                updateContactProperty = "unbundled_module_10";
                                break;
                            case "Green Marketing":
                                updateContactProperty = "unbundled_module_11";
                                break;
                            case "ESG Reporting and Auditing":
                                updateContactProperty = "unbundled_module_12";
                                break;
                            case "Corporate Sustainability Reporting Directive - (CSRD)":
                                updateContactProperty = "unbundled_csrd";
                                break;
                            case "Diploma in Business Sustainability 2024":
                                updateContactProperty = "diploma_enrolment";
                                break;
                            default:
                                console.log("No contact Property defined for:", course);
                        }
                        if (updateContactProperty) {
                            matchedCourses.push({ course, updateContactProperty, status: enrolled });
                        }
                    }
                }

                if (matchedCourses.length > 0) {
                    matchedCourses.forEach(async ({ course, updateContactProperty, status }) => {
                        try {
                            const updateContactPropertyObject = {};
                            updateContactPropertyObject[updateContactProperty] = status;

                            const updateCourseStatus = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${extractHubspotUserId}`, {
                                method: "PATCH",
                                headers: {
                                    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ properties: updateContactPropertyObject })
                            });

                            const response = await updateCourseStatus.json();
                            console.log(`Course: ${course}, Property: ${updateContactProperty}, Status: ${status} - Updated Successfully:`, response);
                        } catch (error) {
                            console.log(`Error updating ${course} status:`, error.message);
                        }
                    });
                } else {
                    console.log("No courses matched the update criteria.");
                }
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
