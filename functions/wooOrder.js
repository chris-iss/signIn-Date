const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

exports.handler = async (event) => {
    // Prevents function from executing multiple times simultaneously
    if (isExecuting) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "Function is already executing" })
        };
    }

    isExecuting = true;

    try {
        // Validate API key
        const getNetlifyKey = event.queryStringParameters?.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;

        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        // Parse request body and check for orderId
        const requestBody = JSON.parse(event.body);
        const orderId = requestBody.orderId;
        const billingUserEmail = requestBody.billing_user_email;

        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing orderId in the request body" })
            };
        }

        const consumerKey = process.env.CONSUMERKEY;
        const consumerSecret = process.env.CONSUMERSECRET;
        const baseUrl = 'https://www.instituteofsustainabilitystudies.com/wp-json/wc/v3/orders';

        if (!consumerKey || !consumerSecret) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Missing WooCommerce credentials" })
            };
        }

        // Function to get order details from WooCommerce
        const getOrderDetails = async () => {
            const url = `${baseUrl}/${orderId}`;
            const auth = 'Basic ' + Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': auth
                    }
                });

                if (!response.ok) {
                    const errorDetails = await response.text();
                    throw new Error(`Error fetching order details: ${response.status} - ${response.statusText} - ${errorDetails}`);
                }

                const data = await response.json();

                let rawData = data;

                // Extract specific metadata from order details
                const keysToExtract = ['name_', 'email_', 'name2_', 'email2_', 'name3_', 'email3_'];
                const extractedData = data.meta_data
                    .filter(meta => keysToExtract.includes(meta.key))
                    .map(meta => ({ key: meta.key, value: meta.value }));

                console.log("EXTRACTED-DATA", extractedData);

                // Mapping of course names to Thinkific course IDs
                const moduleCourseIdMap = {
                    "Introduction to Business Sustainability": "2755212",
                    "Sustainability Plan Development": "2755219",
                    "Sustainability Plan Implementation": "2755224",
                    "Decarbonisation: Achieving Net Zero": "2755233",
                    "Circular Economy": "2755243",
                    "Business with Biodiversity": "2755260",
                    "Diversity, Equity, and Inclusion": "2755264",
                    "Sustainable Finance": "2755272",
                    "Sustainable Operations": "2755276",
                    "Sustainable Supply Chain": "2755278",
                    "Green Marketing": "2755281",
                    "ESG Reporting and Auditing": "2755283",
                    "Certificate in Corporate Sustainability Reporting Directive (CSRD)": "2730358",
                    "Diploma in Business Sustainability 2024": "2622273"
                };

                let courses = [];
                const getCourseBought = data.line_items.map((course) => {
                    courses.push(course.name);
                });

                const selectedCourseIds = [];

                // Select course IDs based on the courses bought
                courses.forEach(course => {
                    if (moduleCourseIdMap.hasOwnProperty(course)) {
                        selectedCourseIds.push(moduleCourseIdMap[course]);
                    } else {
                        console.log(`Course ID not found for '${course}'`);
                    }
                });

                console.log("Enrolling user with course IDs:", selectedCourseIds);

                return { rawData, extractedData, selectedCourseIds };
            } catch (error) {
                console.error('Fetch error:', error.message);
                return null;
            }
        };

        const { rawData, extractedData, selectedCourseIds } = await getOrderDetails();

        if (!extractedData) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Failed to fetch order details" })
            };
        }

        // This function triggers only when extractedData(participants) array is empty and enrolls user into Thinkific.
        if (extractedData.length === 0) {
            try {
                const createThinkificUser = async () => {
                    const url = 'https://api.thinkific.com/api/public/v1/users';
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
                            'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
                        },
                        body: JSON.stringify({
                            first_name: rawData.billing.first_name,
                            last_name: rawData.billing.last_name,
                            email: rawData.billing.email
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error(`Failed to create Thinkific user: ${response.status} - ${JSON.stringify(errorData)}`);
                        throw new Error(`Failed to create Thinkific user: ${response.status} - ${errorData.message}`);
                    }

                    const data = await response.json();
                    console.log(`Thinkific user created successfully for ${firstName} ${lastName}`);
                    return data.id;
                };

                const userId = await createThinkificUser();

                if (userId) {
                    for (const courseId of selectedCourseIds) {
                        await enrollInThinkificCourse(courseId, userId);
                    }
                }

                const enrollInThinkificCourse = async (courseId, userId) => {
                    const url = 'https://api.thinkific.com/api/public/v1/enrollments';
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
                            'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
                        },
                        body: JSON.stringify({
                            course_id: courseId,
                            user_id: userId,
                            activated: true
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error(`Failed to enroll in course: ${response.status} - ${JSON.stringify(errorData)}`);
                        throw new Error(`Failed to enroll in course: ${response.status} - ${errorData.message}`);
                    }

                    const data = await response.json();
                    console.log(`User successfully enrolled in course with ID: ${courseId}`);
                };
            } catch (error) {
                console.error('Error creating Thinkific user or enrolling in course:', error.message);
            }
        }

        const isParticipantArrayEmpty = extractedData.length === 0;
        console.log('IS-PARTICIPANT-ARRAY-EMPTY:', isParticipantArrayEmpty);

        // Function to set BuyerNotParticipant hubspot contact property to true when buying the modules for someone else
        const updateBuyerNotParticipantProperty = async (contactId, setToTrue) => {
            // Define the properties object for updating HubSpot contact
            const thinkificSignDateProperty = {
                "properties": {
                    "buyer_not_participant": setToTrue, // Set to boolean true
                }
            };

            // Make a PATCH request to update the HubSpot contact
            const updateContact = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(thinkificSignDateProperty)
            });

            const response = await updateContact.json();
            console.log("Buyer Not Participant Update Response:", response);
        };

        // Function to search for a HubSpot contact using Thinkific email
        const hubspotSearchContact = async () => {
            const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

            try {
                const hubspotSearchProperties = {
                    after: "0",
                    filterGroups: [
                        { filters: [{ operator: "EQ", propertyName: "email", value: billingUserEmail }] },
                        { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: billingUserEmail }] },
                    ],
                    limit: "100",
                    properties: ["email", "buyer_not_participant", "id"], // Include id for updating
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
                const hsObjectId = hubspotContactResponse.results[0].properties.hs_object_id;
                const buyNotPart = hubspotContactResponse.results[0].properties.buyer_not_participant;
                console.log("SEARCH RESULT:", hsObjectId, buyNotPart)

                // If hsObjectId is found, update the buyer_not_participant property
                if (hsObjectId) {
                    await updateBuyerNotParticipantProperty(hsObjectId, true); // Pass boolean true
                }
            } catch (error) {
                console.log("HUBSPOT SEARCH ERROR", error.message);
            }
        };

        await hubspotSearchContact();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Process completed successfully" })
        };
    } catch (error) {
        console.error('Handler error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Error: ${error.message}` })
        };
    } finally {
        isExecuting = false;
    }
};
