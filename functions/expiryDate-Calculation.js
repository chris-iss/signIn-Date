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
        const requestBodyArray = JSON.parse(event.body);
        console.log("Request Body:", requestBodyArray);

        if (!Array.isArray(requestBodyArray) || requestBodyArray.length === 0) {
            isExecuting = false;
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Request body should be a non-empty array" })
            };
        }

        // const { courseId, expiryDate, userId } = requestBodyArray[0];
        // console.log("courseId:", courseId);
        // console.log("expiryDate:", expiryDate);
        // console.log("userId:", userId);

        if (!courseId || !expiryDate || !userId) {
            isExecuting = false;
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing courseId, expiryDate, or userId in the request body" })
            };
        }

        // Ensure expiryDate ends with 'Z' and is in ISO 8601 format
        let correctedExpiryDate = expiryDate;

        if (!expiryDate.endsWith('Z')) {
            correctedExpiryDate = `${expiryDate.slice(0, -1)}Z`;  // Remove the last character and append 'Z'
        }

        console.log("Corrected expiryDate:", correctedExpiryDate);

        // // Function to fetch the enrollment ID
        // const fetchEnrollmentId = async (userId, courseId) => {
        //     const url = `https://api.thinkific.com/api/public/v1/enrollments?user_id=${userId}&course_id=${courseId}`;

        //     try {
        //         const response = await fetch(url, {
        //             method: 'GET',
        //             headers: {
        //                 'Content-Type': 'application/json',
        //                 'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
        //                 'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
        //             }
        //         });

        //         if (!response.ok) {
        //             const errorData = await response.json();
        //             console.error(`Failed to fetch enrollments: ${response.status} - ${JSON.stringify(errorData)}`);
        //             throw new Error(`Failed to fetch enrollments: ${response.status} - ${errorData.error}`);
        //         }

        //         const data = await response.json();
        //         if (data.items.length === 0) {
        //             throw new Error('Enrollment not found');
        //         }

        //         return data.items[0].id; // Return the first matching enrollment ID
        //     } catch (error) {
        //         console.error('Error fetching enrollment ID:', error.message);
        //         throw error;
        //     }
        // };

        // // Function to update Thinkific user expiry date
        // const updateThinkificUserExpiryDate = async (enrollmentId, expiryDate) => {
        //     const url = `https://api.thinkific.com/api/public/v1/enrollments/${enrollmentId}`;

        //     try {
        //         const response = await fetch(url, {
        //             method: 'PUT',
        //             headers: {
        //                 'Content-Type': 'application/json',
        //                 'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
        //                 'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
        //             },
        //             body: JSON.stringify({
        //                 activated_at: new Date().toISOString(),
        //                 expiry_date: expiryDate
        //             })
        //         });

        //         if (!response.ok) {
        //             const errorData = await response.json();
        //             console.error(`Failed to update Thinkific user expiry date: ${response.status} - ${JSON.stringify(errorData)}`);
        //             throw new Error(`Failed to update Thinkific user expiry date: ${response.status} - ${errorData.message}`);
        //         }

        //         const data = await response.json();
        //         console.log(`Thinkific user expiry date updated successfully for enrollmentId: ${enrollmentId}`);
        //         return data;
        //     } catch (error) {
        //         console.error('Error updating Thinkific user expiry date:', error.message);
        //         throw error;
        //     }
        // };

        // // Fetch the enrollment ID
        //const enrollmentId = await fetchEnrollmentId(userId, courseId);
        //console.log("Enrollment ID:", enrollmentId)

        // // Update the Thinkific user expiry date
        // await updateThinkificUserExpiryDate(enrollmentId, correctedExpiryDate);

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
