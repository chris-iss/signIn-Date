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
    "2822347": "bs_diploma_course_id"
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
    "Diploma in Business Sustainability"
];

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

        console.log("RECEIVED PRODUCT ID:", responseDataId);
        console.log("COURSE-SELECTED:", coursesSelected);

        const selectedCoursesData = coursesSelected.split(",");

        const contactPropertyToUpdate = thinkificProductIdMap[responseDataId];
        if (!contactPropertyToUpdate) {
            console.log("Invalid product ID:", responseDataId);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: `Invalid product ID: ${responseDataId}` })
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

                const response = await fetch(hubspotBaseURL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(hubspotSearchProperties),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const searchContact = await response.json();

                if (!searchContact.results.length) {
                    throw new Error("No contact found");
                }

                const extractHubspotUserId = searchContact.results[0].id;

                const updateCustomerCourse = async () => {
                    try {
                        // Concatenate the selected courses into a single string
                        const customerCourseValue = selectedCoursesData.join(", ");

                        const updateProperty = {
                            unbundled_module_type: customerCourseValue
                        };

                        console.log("UPDATING Customer_Course TO:", customerCourseValue);

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

                // Update Customer_Course property with selected courses
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
