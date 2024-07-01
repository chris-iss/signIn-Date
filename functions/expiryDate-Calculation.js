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

        // Parse request body and check for required fields
        let requestBody;
        try {
            requestBody = JSON.parse(event.body);
        } catch (e) {
            isExecuting = false;
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid JSON format in request body" })
            };
        }

        console.log("Request Body:", requestBody);

        const { courseId, expiryDate, userId } = requestBody;

        if (!courseId || !expiryDate || !userId) {
            isExecuting = false;
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing courseId, expiryDate, or userId in the request body" })
            };
        }

        const course_id = courseId;
        const expiry_date = expiryDate;
        const user_id = userId;

        // Ensure expiryDate ends with 'Z' and is in ISO 8601 format
        let correctedExpiryDate = expiry_date;

        if (!expiry_date.endsWith('Z')) {
            correctedExpiryDate = `${expiry_date.slice(0, -1)}Z`;  // Remove the last character and append 'Z'
        }

        console.log("CourseId:", course_id);
        console.log("UserId:", user_id);
        console.log("Corrected ExpiryDate:", correctedExpiryDate);

        // Function to fetch the enrollment ID
        const fetchEnrollmentId = async (userId, courseId) => {
            const url = `https://api.thinkific.com/api/public/v1/enrollments?user_id=${userId}&course_id=${courseId}`;

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
                        'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Failed to fetch enrollments: ${response.status} - ${JSON.stringify(errorData)}`);
                    throw new Error(`Failed to fetch enrollments: ${response.status} - ${errorData.error}`);
                }

                const data = await response.json();
                if (data.items.length === 0) {
                    throw new Error('Enrollment not found');
                }

                return data.items[0].id; // Return the first matching enrollment ID
            } catch (error) {
                console.error('Error fetching enrollment ID:', error.message);
                throw error;
            }
        };

        // Function to update Thinkific user expiry date
        const updateThinkificUserExpiryDate = async (enrollmentId) => {
            const url = `https://api.thinkific.com/api/public/v1/enrollments/${enrollmentId}`;

            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
                        'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
                    },
                    body: JSON.stringify({
                        activated_at: new Date().toISOString(),
                        expiry_date: correctedExpiryDate
                    })
                });

                console.log("Response Status:", response.status);
                console.log("Response Headers:", response.headers);

                if (response.status === 204) {
                    console.log(`Thinkific user expiry date updated successfully for enrollmentId: ${enrollmentId}`);
                    return;
                }

                const responseText = await response.text(); // Capture the raw response text
                console.log("Update Enrollment Response Text:", responseText); // Log the raw response text

                if (!response.ok) {
                    console.error(`Failed to update Thinkific user expiry date: ${response.status} - ${responseText}`);
                    throw new Error(`Failed to update Thinkific user expiry date: ${response.status} - ${responseText}`);
                }

                if (!responseText) {
                    console.error('Empty response text');
                    throw new Error('Empty response text');
                }

                let data;
                try {
                    data = JSON.parse(responseText); // Attempt to parse the response text as JSON
                } catch (error) {
                    console.error('Error parsing JSON response:', error.message);
                    throw new Error('Error parsing JSON response');
                }

                console.log(`Thinkific user expiry date updated successfully for enrollmentId: ${enrollmentId}`);
                return data;
            } catch (error) {
                console.error('Error updating Thinkific user expiry date:', error.message);
                throw error;
            }
        };

        // Fetch the enrollment ID
        const enrollmentId = await fetchEnrollmentId(user_id, course_id);
        console.log("Enrollment ID:", enrollmentId);

        // Update the Thinkific user expiry date
        await updateThinkificUserExpiryDate(enrollmentId);

        isExecuting = false;
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success" })
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
