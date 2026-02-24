const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

const thinkificProductIdMap = {
    "2965465": "unbundled_module_1_course_id",
    "2965473": "unbundled_module_2_course_id",
    "2965479": "unbundled_module_3_course_id",
    "2965489": "unbundled_module_4_course_id",
    "2965499": "unbundled_module_5_course_id",
    "2965518": "unbundled_module_6_course_id",
    "2965523": "unbundled_module_7_course_id",
    "2965534": "unbundled_module_8_course_id",
    "2965538": "unbundled_module_9_course_id",
    "2965541": "unbundled_module_10_course_id",
    "2965546": "unbundled_module_11_course_id",
    "2965548": "unbundled_module_12_course_id",
    "2937008": "unbundled_csrd_product_id",
    "2822347": "bs_diploma_course_id",
    "3363718": "baltic_diploma_product_id",
    "3691120": "diploma_in_business_sustainability_access_apprenticeships_product_id"
};

const coursesMap = [
    "Certificate in Business Sustainability",
    "Certificate in Sustainability Plan Development",
    "Certificate in Sustainability Plan Implementation",
    "Certificate in Decarbonisation: Achieving Net Zero",
    "Certificate in Circular Economy",
    "Certificate in Business with Biodiversity",
    "Certificate in Diversity Equity and Inclusion",
    "Certificate in Sustainable Finance",
    "Certificate in Sustainable Business Operations",
    "Certificate in Sustainable Supply Chain",
    "Certificate in Green Marketing",
    "Certificate in ESG Reporting and Auditing",
    "Certificate in Corporate Sustainability Reporting Directive (CSRD)",
    "Diploma in Business Sustainability",
    "Diploma in Baltic Apprenticeships",
    "Diploma in Business Sustainability Access Apprenticeships"
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
            return fetchWithRetry(url, options, retries - 1);
        } else {
            throw new Error(`Max retries reached. ${error.message}`);
        }
    }
}

// This codebase Thinkific Product ID in real-time and updates Product id HubSpot properties
exports.handler = async (event) => {
    try {
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

        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        const { email, responseDataId, coursesSelected } = extractParameters;

        console.log("SELECTED PRODUCID:", responseDataId);
        console.log("COURSE-SELECTED:", coursesSelected);

        const selectedCoursesData = coursesSelected.split(",");

        const contactPropertyToUpdate = thinkificProductIdMap[responseDataId];
        if (!contactPropertyToUpdate) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid product ID" })
            };
        }

        const hubspotSearchContact = async () => {
            const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

            try {
                const hubspotSearchProperties = {
                    filterGroups: [
                        { filters: [{ operator: "EQ", propertyName: "email", value: email }] },
                        { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: email }] },
                    ],
                    limit: 100,
                    properties: [
                        "id",
                        "email",
                        contactPropertyToUpdate
                    ],
                    sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
                };

                const searchContact = await fetchWithRetry(hubspotBaseURL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(hubspotSearchProperties),
                });

                if (!searchContact.results.length) {
                    throw new Error("No contact found");
                }


                const extractHubspotUserId = searchContact.results[0].id;

                const updateCoursePrdId = async () => {
                    try {
                        const unbundledProductIdProperty = {};
                        unbundledProductIdProperty[contactPropertyToUpdate] = `${responseDataId}`;

                        //Test Case
                        let productIds = [];
                        productIds.push(unbundledProductIdProperty);

                        console.log("CHECKING PRODUCT ID'S:", productIds)


                        const updateContact = await fetchWithRetry(`https://api.hubapi.com/crm/v3/objects/contacts/${extractHubspotUserId}`, {
                            method: "PATCH",
                            headers: {
                                Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ properties: unbundledProductIdProperty })
                        });

                        console.log("Course Product Id Updated:", updateContact);

                    } catch (error) {
                        console.log("Error updating module completion:", error.message);
                    }
                };

                await updateCoursePrdId();
                

                const matchedCourses = [];

                for (let course of coursesMap) {
                    console.log("CHECKING FOR COURSE IN LOOP:", course)
                    if (selectedCoursesData.includes(course)) {
                        const enrolled = "Enrolled";
                        let updateContactProperty;
                        switch(course) {
                            case "Certificate in Business Sustainability":
                                updateContactProperty = "unbundled_module_1";
                                break;
                            case "Certificate in Sustainability Plan Development":
                                updateContactProperty = "unbundled_module_2";
                                break;
                            case "Certificate in Sustainability Plan Implementation":
                                updateContactProperty = "unbundled_module_3";
                                break;
                            case "Certificate in Decarbonisation: Achieving Net Zero":
                                updateContactProperty = "unbundled_module_4";
                                break;
                            case "Certificate in Circular Economy":
                                updateContactProperty = "unbundled_module_5";
                                break;
                            case "Certificate in Business with Biodiversity":
                                updateContactProperty = "unbundled_module_6";
                                break;
                            case "Certificate in Diversity Equity and Inclusion":
                                updateContactProperty = "unbundled_module_7";
                                break;
                            case "Certificate in Sustainable Finance":
                                updateContactProperty = "unbundled_module_8";
                                break;
                            case "Certificate in Sustainable Business Operations":
                                updateContactProperty = "unbundled_module_9";
                                break;
                            case "Certificate in Sustainable Supply Chain":
                                updateContactProperty = "unbundled_module_10";
                                break;
                            case "Certificate in Green Marketing":
                                updateContactProperty = "unbundled_module_11";
                                break;
                            case "Certificate in ESG Reporting and Auditing":
                                updateContactProperty = "unbundled_module_12";
                                break;
                            case "Certificate in Corporate Sustainability Reporting Directive (CSRD)": 
                                updateContactProperty = "unbundled_csrd";
                                break;
                            case "Diploma in Business Sustainability":
                                updateContactProperty = "diploma_enrolment";
                                break;
                            case "Diploma in Baltic Apprenticeships":
                                updateContactProperty = "baltic_diploma_enrolment";
                                break;
                            case "Diploma in Business Sustainability Access Apprenticeships":
                                updateContactProperty = "diploma_access_apprenticeships_enrollement";
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
                    await Promise.all(matchedCourses.map(async ({ course, updateContactProperty, status }) => {
                        try {
                            const updateContactPropertyObject = {};
                            updateContactPropertyObject[updateContactProperty] = status;

                            const updateCourseStatus = await fetchWithRetry(`https://api.hubapi.com/crm/v3/objects/contacts/${extractHubspotUserId}`, {
                                method: "PATCH",
                                headers: {
                                    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ properties: updateContactPropertyObject })
                            });

                            console.log(`Course: ${course}, Property: ${updateContactProperty}, Status: ${status} - Updated Successfully:`, updateCourseStatus);
                        } catch (error) {
                            console.log(`Error updating ${course} status:`, error.message);
                        }
                    }));
                } else {
                    console.log("No courses matched the update criteria.");
                }

                  ////////////////////Update Unbudled Module Type//////////////////////////
                  const updateCustomerCourse = async () => {
                    try {
                        // Building the multi-line text for unbundled_module_type
                        const updateProperty = {
                            unbunled_bought_modules: selectedCoursesData.join("\n") // Join selected courses with newline
                        };

                        console.log("UPDATING unbundled_module_type TO:", updateProperty);
                        
                        const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${extractHubspotUserId}`, {
                            method: "PATCH",
                            headers: {
                                Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ properties: updateProperty })
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const updateContact = await response.json();
                        console.log("Customer_Course Updated:", updateContact);

                    } catch (error) {
                        console.log("Error updating Customer_Course:", error.message);
                    }
                };

                // Update unbundled_module_type property with selected courses
                await updateCustomerCourse();
            } catch (error) {
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
