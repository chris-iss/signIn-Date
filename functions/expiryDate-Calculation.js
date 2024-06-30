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
        

        const updateThinkificUserExpiryDate = async () => {
            const url = `https://api.thinkific.com/api/public/v1/enrollments/${requestBody.courseId}`;
            
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
                        'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
                    },
                    body: JSON.stringify({
                        activated_at:  new Date().toISOString(),
                        expiry_date: requestBody.expiryDate
                    })
                });
        
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`Failed to update Thinkific user expiry date: ${response.status} - ${JSON.stringify(errorData)}`);
                    throw new Error(`Failed to update Thinkific user expiry date: ${response.status} - ${errorData.message}`);
                }
        
                const data = await response.json();
                console.log(`Thinkific user expiry date updated successfully for enrollmentId: ${enrollmentId}`);
                return data;
            } catch (error) {
                console.error('Error updating Thinkific user expiry date:', error.message);
                throw error;
            }
        };
        
        updateThinkificUserExpiryDate(enrollmentId, activatedAt, expiryDate)
            .then(data => console.log('Update successful:', data))
            .catch(error => console.error('Update failed:', error.message));
        

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
