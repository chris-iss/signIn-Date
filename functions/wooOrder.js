const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

exports.handler = async (event) => {
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
            isExecuting = false;
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
            isExecuting = false;
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing orderId in the request body" })
            };
        }

        // WooCommerce credentials
        const consumerKey = process.env.CONSUMERKEY;
        const consumerSecret = process.env.CONSUMERSECRET;
        const baseUrl = 'https://www.stg.instituteofsustainabilitystudies.com/wp-json/wc/v3/orders';

        if (!consumerKey || !consumerSecret) {
            isExecuting = false;
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Missing WooCommerce credentials" })
            };
        }

        let buyerBillingData;
        let courseType = [];
        let countsArray;

        // Step 1: Fetch order details from WooCommerce
        const getOrderDetails = async () => {
            const url = `${baseUrl}/${orderId}`;
            const auth = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

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

                buyerBillingData = data;

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
                data.line_items.forEach(course => {
                    courses.push(course.name);
                });

                // Holds course IDs
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

                // Function to determine if course is Unbundled or Diploma or even both
                const diplomaCourse = "Diploma in Business Sustainability 2024";

                const hasDiploma = courses.includes(diplomaCourse);

                const hasOtherCourses = courses.some(course => course !== diplomaCourse);

                if (hasDiploma) {
                    courseType.push("Diploma");
                }

                if (hasOtherCourses) {
                    courseType.push("Unbundled");
                }

                // Count occurrences of "Diploma" and "Unbundled" in the resultArray
                const diplomaCount = courseType.filter(item => item === "Diploma").length;
                const unbundledCount = courseType.filter(item => item === "Unbundled").length;

                // Create a new array to hold the counts
                countsArray = [
                    `Unbundled: ${unbundledCount}`,
                    `Diploma: ${diplomaCount}`,
                ];

                // if both unbundled and diploma are selected 
                if (diplomaCount > 0 && unbundledCount > 0) {
                    countsArray = [
                        `Unbundled: ${unbundledCount}`,
                        `Diploma: ${diplomaCount}`,
                    ];
                }

                return { extractedData, selectedCourseIds };
            } catch (error) {
                console.error('Fetch error:', error.message);
                throw error;
            }
        };

        const { extractedData, selectedCourseIds } = await getOrderDetails();

        let thinkificUserId;

        // Format Participants Payload
        const participants = [];
        for (let i = 1; i <= 3; i++) {
            const nameKey = `name${i === 1 ? '_' : i + '_'}`;
            const emailKey = `email${i === 1 ? '_' : i + '_'}`;

            const name = extractedData.find(item => item.key === nameKey)?.value;
            const email = extractedData.find(item => item.key === emailKey)?.value;

            if (name && email) {
                const [firstName, lastName] = name.split(' ');
                participants.push({ firstName, lastName, email });
            }
        }

        // Step 2: If participant array is empty: BNP === Participant is Buyer
        if (participants.length === 0) {
            console.log(`Participant is Buyer - Firstname: ${buyerBillingData.billing.first_name}, lastName: ${buyerBillingData.billing.last_name}, Email: ${buyerBillingData.billing.email}`);
            console.log("Selected Course IDs:", selectedCourseIds);
        }

        // Step 3: If participant array is not empty: BNP === Buyer is buying for participants
        if (participants.length > 0) {
            console.log("Participants Details", participants);
            console.log("Course-ID", selectedCourseIds);

            // 3.1 - Function to set BNP to No then Yes via Zapier
            const updateBuyerNotParticipantPropertyNo = async (contactId, setToNo) => {
                const thinkificSignDateProperty = {
                    "properties": {
                        "buyer_not_participant": setToNo,
                    }
                };

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

            // 3.2 - Function to search for a HubSpot contact using Thinkific email
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
                        properties: ["email", "buyer_not_participant", "main_thinkific_user_id", "id"], // Include id for updating
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
                    const hsObjectId = hubspotContactResponse.results[0].properties.hs_object_id;
                    thinkificUserId = hubspotContactResponse.results[0].properties.main_thinkific_user_id;

                    if (hsObjectId) {
                        let buyerNotParticipantNo = false;
                        await updateBuyerNotParticipantPropertyNo(hsObjectId, buyerNotParticipantNo);
                    }
                } catch (error) {
                    console.log("HUBSPOT SEARCH ERROR", error.message);
                }
            };

            await hubspotSearchContact();

            // 3.3 - Function to create Thinkific user
            const createThinkificUser = async (firstName, lastName, email) => {
                const url = 'https://api.thinkific.com/api/public/v1/users';
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
                        'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
                    },
                    body: JSON.stringify({
                        first_name: firstName,
                        last_name: lastName,
                        email: email
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Failed to create Thinkific user: ${response.status} - ${JSON.stringify(errorData)}`);
                    throw new Error(`Failed to create Thinkific user: ${response.status} - ${errorData.message}`);
                }

                const data = await response.json();
                console.log(`Thinkific user created successfully for ${firstName} ${lastName} userId: ${data.id}`);
                return data.id;
            };

            // 3.4 - Function to fetch user in Thinkific 
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
                        activated_at: new Date().toISOString(),
                        expiry_date: null
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to enroll in Thinkific course: ${response.status} - ${errorData.message}`);
                }

                const data = await response.json();
                console.log(`User enrolled in Thinkific course successfully: ${courseId}`);
                return data;
            };

            // 3.5 - Create Thinkific users and enroll them in courses
            let thinkificCourseId;
            for (const participant of participants) {
                try {

                    // Create or update contact in HubSpotc
                    await fetch('https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/' + encodeURIComponent(participant.email), {
                        method: 'POST',
                        headers: {
                            "AUTHORIZATION": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            properties: [
                                { property: 'firstname', value: participant.firstName },
                                { property: 'lastname', value: participant.lastName },
                                { property: 'email', value: participant.email }
                            ]
                        })
                    });


                    if (thinkificUserId) {
                        console.log(`"Yes Thinnkifc User Exist Already" - Enrollment:, courseId: ${courseId} userId: ${thinkificUserId}`);
                       
                        await fetch('https://hooks.zapier.com/hooks/catch/14129819/2b7yprs/', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            selectdCoursesType: courseType,
                            selectedCourseCout: countsArray,
                            thinkificCourseId: thinkificCourseId,
                            thnkificUserId: thinkificUserId,
                            firstname: participant.firstName,
                            lastname: participant.lastName,
                            email: participant.email,
                            currency: requestBody.currency,
                            startDate: requestBody.startDate,
                            unbundledSkuCode: requestBody.unbundledSkuCode,
                            diplomaSkuCode: requestBody.diplomaSkuCode,
                            BNP: "Yes"
                        })
                    });
                    } else {
                        const userId = await createThinkificUser(participant.firstName, participant.lastName, participant.email);

                        for (const courseId of selectedCourseIds) {
                            console.log(`Enrollment:, courseId: ${courseId} userId: ${userId}`);
                                //await enrollInThinkificCourse(courseId, userId);
                                thinkificCourseId = courseId;
    
                                await fetch('https://hooks.zapier.com/hooks/catch/14129819/2b7yprs/', {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    selectdCoursesType: courseType,
                                    selectedCourseCout: countsArray,
                                    thinkificCourseId: thinkificCourseId,
                                    thnkificUserId: userId,
                                    firstname: participant.firstName,
                                    lastname: participant.lastName,
                                    email: participant.email,
                                    currency: requestBody.currency,
                                    startDate: requestBody.startDate,
                                    unbundledSkuCode: requestBody.unbundledSkuCode,
                                    diplomaSkuCode: requestBody.diplomaSkuCode,
                                    BNP: "Yes"
                                })
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error creating HubSpot contact, enrolling in Thinkific, or sending data to Zapier:', error.message);
                }
            }

            console.log("Processed participantInfo:", participants);

        }

        isExecuting = false;
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success", participants, selectedCourseIds })
        };
    } catch (error) {
        console.error('Error processing data:', error.message);
        isExecuting = false;
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message })
        };
    }
};
