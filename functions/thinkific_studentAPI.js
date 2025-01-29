const fetch = require("node-fetch");
const THINKIFIC_API_KEY = process.env.THINKIFIC_API_KEY;
const THINKIFIC_SUBDOMAIN = process.env.THINKIFIC_SUB_DOMAIN;

exports.handler = async (event, context) => {
    const userId = event.queryStringParameters.userId;
    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "User ID is required" }),
        };
    }

    try {
        const response = await fetch(
            `https://${THINKIFIC_SUBDOMAIN}/api/public/v1/enrollments?user_id=${userId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${THINKIFIC_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            throw new Error("Failed to fetch enrollments");
        }

        const data = await response.json();
        
        // Return enrollments data
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error("Error fetching enrollments:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch enrollments" }),
        };
    }
};