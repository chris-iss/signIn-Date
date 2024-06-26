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
        const billingUserEmail = requestBody.billing_user_email
        let contactId = "";

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

                let rawData = data

                // Extract specific metadata from order details
                const keysToExtract = ['name_', 'email_', 'name2_', 'email2_', 'name3_', 'email3_'];
                const extractedData = data.meta_data
                    .filter(meta => keysToExtract.includes(meta.key))
                    .map(meta => ({ key: meta.key, value: meta.value }));

                console.log("EXTRACTED-DATA", extractedData);

                // Mapping of course names to Thinkific course IDss
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

        const {rawData, extractedData, selectedCourseIds } = await getOrderDetails();

        if (!extractedData) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Failed to fetch order details" })
            };
        }

        // This function triggers only when extractedData(participants) array is empty and enrolls user into thinkific.
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

                await createThinkificUser();
                
                if (data.id) {
                    for (const courseId of selectedCourseIds) {
                        await enrollInThinkificCourse(courseId, data.id);
                    }
                }
        
                //Enrol user into thinkific course
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
        
            } catch (error) {
                console.error('Error sending notification to Zapier:', error.message);
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "No participant data found, notification sent to Zapier" })
            };
        }


        ////////////////Function to set BuyerNotParicipant hubspot contact property to Yes when buying the modules for someone else//////////////////////////
        if (extractedData.length > 0) {

            //Update Buyer not Participant Conatct Property
            const updateBuyerNotParticipantProperty = async (contactId, setToYes) => {
    
                // Define the properties object for updating HubSpot contact
                const thinkificSignDateProperty = {
                    "properties": {
                        "buyer_not_participant": setToYes,
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

                    contactId = hsObjectId

                    // If hubspotId and buyerNotParticipant, update the property
                    if (hsObjectId) {
                        let buyerNotParticipant = true
                        await updateBuyerNotParticipantProperty(hsObjectId, buyerNotParticipant);
                    }
                } catch (error) {
                    console.log("HUBSPOT SEARCH ERROR", error.message);
                }
            };

            await hubspotSearchContact();


            const getDealsByContactId = async () => {
                const hubspotBaseURL = `https://api.hubapi.com/crm/v3/associations/contacts/deals/${contactId}`;
            
                const response = await fetch(hubspotBaseURL, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
            
                if (!response.ok) {
                    throw new Error(`HubSpot deal retrieval failed: ${response.statusText}`);
                }
            
                const data = await response.json();
                console.log("DEAL SEARCH RESULT:", data)
                return data.results;
            };
        }

        await getDealsByContactId();



        // ENGINE FUNCTION - Extract participant information from order details
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


        // Function to create Thinkific user
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


        // Function to enroll user in Thinkific course
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


        // Create Thinkific users and enroll them in courses
        for (const participant of participants) {
            try {
                const userId = await createThinkificUser(participant.firstName, participant.lastName, participant.email);

                for (const courseId of selectedCourseIds) {
                    console.log(`Enrollment:, courseId: ${courseId} userId: ${userId}`)
                    await enrollInThinkificCourse(courseId, userId);
                }

                // Create or update contact in HubSpot
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

                // Send data to Zapier
                await fetch('https://hooks.zapier.com/hooks/catch/14129819/2onxbma/', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        firstname: participant.firstName,
                        lastname: participant.lastName,
                        email: participant.email,
                        currency: requestBody.currency,
                        startDate: requestBody.startDate,
                        unbundledSkuCode: requestBody.unbundledSkuCode,
                        diplomaSkuCode: requestBody.diplomaSkuCode
                    })
                });
            } catch (error) {
                console.error('Error creating HubSpot contact, enrolling in Thinkific, or sending data to Zapier:', error.message);
            }
        }

        console.log("Processed participantInfo:", participants);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Data processed successfully", participants })
        };
    } catch (error) {
        console.error('Error processing data:', error.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message })
        };
    } finally {
        isExecuting = false;
    }
};