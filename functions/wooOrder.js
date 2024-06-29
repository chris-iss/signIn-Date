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
        const baseUrl = 'https://www.instituteofsustainabilitystudies.com/wp-json/wc/v3/orders';

        if (!consumerKey || !consumerSecret) {
            isExecuting = false;
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Missing WooCommerce credentials" })
            };
        }

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

                let buyerData = data

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

                return { extractedData, selectedCourseIds };
            } catch (error) {
                console.error('Fetch error:', error.message);
                throw error;
            }
        };

        const { extractedData, selectedCourseIds } = await getOrderDetails();

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

        //Step 2: If participant array is empty: BNP === Participant is Buyer
        if (participants.length === 0) {
            console.log(`Participant is Buyer - Firstname: ${buyerData.billing.first_name}, lastName: ${buyerData.billing.last_name}, Email: ${buyerData.billing.email}`);
            console.log("Selected Course IDs:", selectedCourseIds);
        }

        // Step 3: If participant array is not empty: BNP === Buyer is buying for participants
        if (participants.length > 0) {
            console.log("Participannts", participants)
            console.log("Course-ID", selectedCourseIds)
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
