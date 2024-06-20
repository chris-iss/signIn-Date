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
        const getNetlifyKey = event.queryStringParameters?.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;

        if (getNetlifyKey !== getValidationKey) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" })
            };
        }

        const requestBody = JSON.parse(event.body);
        const orderId = requestBody.orderId;

        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing orderId in the request body" })
            };
        }

        const consumerKey = process.env.CONSUMERKEY;
        const consumerSecret = process.env.CONSUMERSECRET;
        const baseUrl = 'https://www.stg.instituteofsustainabilitystudies.com/wp-json/wc/v3/orders';

        if (!consumerKey || !consumerSecret) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Missing WooCommerce credentials" })
            };
        }

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
                console.log("ORIGINAL-DATA", data);

                const keysToExtract = ['name_', 'email_', 'name2_', 'email2_', 'name3_', 'email3_', 'phone_', 'phone2_', 'phone3_'];
                const extractedData = data.meta_data
                    .filter(meta => keysToExtract.includes(meta.key))
                    .map(meta => ({ key: meta.key, value: meta.value }));

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
                    "Corporate Sustainability Reporting Directive - (CSRD)": "2730358",
                };

                let courses = [];
                const getCourseBought = data.line_items.map((course) => {
                    courses.push(course.name);
                });

                const selectedCourseIds = [];
                
                courses.forEach(course => {
                    if (moduleCourseIdMap.hasOwnProperty(course)) {
                        selectedCourseIds.push(moduleCourseIdMap[course]);
                    } else {
                        console.log(`Course ID not found for '${course}'`);
                    }
                });

                console.log("Enrolling user with course IDs:", selectedCourseIds);

                return { extractedData, selectedCourseIds };
            } catch (error) {
                console.error('Fetch error:', error.message);
                return null;
            }
        };

        const { extractedData, selectedCourseIds } = await getOrderDetails();

        if (!extractedData) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Failed to fetch order details" })
            };
        }

        if (extractedData.length === 0) {
            try {
                const notifyZapier = await fetch('https://hooks.zapier.com/hooks/catch/14129819/2onxbma/', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: "No participant data found for the order",
                        orderId: orderId
                    })
                });

                if (!notifyZapier.ok) {
                    const zapierErrorData = await notifyZapier.json();
                    console.error(`Failed to send notification to Zapier: ${notifyZapier.status} - ${zapierErrorData.message}`);
                } else {
                    const zapierResponseData = await notifyZapier.json();
                    console.log(`Notification sent to Zapier successfully:`, zapierResponseData);
                }
            } catch (error) {
                console.error('Error sending notification to Zapier:', error.message);
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "No participant data found, notification sent to Zapier" })
            };
        }

        const participants = [];
        for (let i = 1; i <= 3; i++) {
            const nameKey = `name${i === 1 ? '_' : i + '_'}`;
            const emailKey = `email${i === 1 ? '_' : i + '_'}`;
            const phoneKey = `phone${i === 1 ? '_' : i + '_'}`;

            const name = extractedData.find(item => item.key === nameKey)?.value;
            const email = extractedData.find(item => item.key === emailKey)?.value;
            const phone = extractedData.find(item => item.key === phoneKey)?.value;

            if (name && email && phone) {
                const [firstName, lastName] = name.split(' ');
                participants.push({ firstName, lastName, email, phone });
            }
        }

        const createThinkificUser = async (firstName, lastName, email, phone) => {
            const url = 'https://api.thinkific.com/api/public/v1/users';
            const headers = {
                'Content-Type': 'application/json',
                'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
                'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
            };

            console.log("Thinkific user creation headers:", headers);

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone_number: phone
                })
            });

            const responseBody = await response.text();

            if (!response.ok) {
                console.error('Response body:', responseBody);
                throw new Error(`Failed to create Thinkific user: ${response.status} - ${responseBody}`);
            }

            const data = JSON.parse(responseBody);
            console.log(`Thinkific user created successfully for ${firstName} ${lastName}`);
            return data.id;
        };

        const enrollInThinkificCourse = async (courseId, userId) => {
            const url = 'https://api.thinkific.com/api/public/v1/enrollments';
            const headers = {
                'Content-Type': 'application/json',
                'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
                'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
            };

            console.log("Thinkific enrollment headers:", headers);

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    course_id: courseId,
                    user_id: userId,
                    activated_at: new Date().toISOString(),
                    expiry_date: null
                })
            });

            const responseBody = await response.text();

            if (!response.ok) {
                console.error('Response body:', responseBody);
                throw new Error(`Failed to enroll in Thinkific course: ${response.status} - ${responseBody}`);
            }

            const data = JSON.parse(responseBody);
            console.log(`User enrolled in Thinkific course successfully: ${courseId}`);
            return data;
        };

        for (const participant of participants) {
            try {
                const userId = await createThinkificUser(participant.firstName, participant.lastName, participant.email, participant.phone);

                for (const courseId of selectedCourseIds) {
                    await enrollInThinkificCourse(courseId, userId);
                }

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
                            { property: 'email', value: participant.email },
                        ]
                    })
                });

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
                        skuCode: requestBody.skuCode
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
