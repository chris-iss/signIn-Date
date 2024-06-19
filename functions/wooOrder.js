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
        console.log("START-DATE", requestBody.startDate)

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
                console.log(`Fetching order details from: ${url}`);
                console.log(`Using credentials: ${consumerKey} / ${consumerSecret}`);

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

                const keysToExtract = ['name_', 'email_', 'name2_', 'email2_', 'name3_', 'email3_'];
                const extractedData = data.meta_data
                    .filter(meta => keysToExtract.includes(meta.key))
                    .map(meta => ({ key: meta.key, value: meta.value }));

                console.log("EXTRACTED-DATA", extractedData);

                return extractedData;
            } catch (error) {
                console.error('Fetch error:', error.message);
                return null;
            }
        };

        const extractedData = await getOrderDetails();

        if (!extractedData) {
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Failed to fetch order details" })
            };
        }

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

        async function createHubSpotContact(firstName, lastName, email) {
            const url = `https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(email)}`;

            const requestOptions = {
                method: 'POST',
                headers: {
                    "AUTHORIZATION": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    properties: [
                        { property: 'firstname', value: firstName },
                        { property: 'lastname', value: lastName },
                        { property: 'email', value: email }
                    ]
                })
            };

            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to create HubSpot contact: ${response.status} - ${errorData.message}`);
            }

            const data = await response.json();
            console.log(`Contact created successfully for ${firstName} ${lastName}`);
            return data;
        }

        for (const participant of participants) {
            try {
                await createHubSpotContact(participant.firstName, participant.lastName, participant.email);

                const sendResponseToZapier = await fetch('https://hooks.zapier.com/hooks/catch/14129819/2onxbma/', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        firstname: participant.firstName,
                        lastname: participant.lastName,
                        email: participant.email,
                        currency: requestBody.currency,
                        startDate: requestBody.startdate
                    })
                });

                if (!sendResponseToZapier.ok) {
                    const zapierErrorData = await sendResponseToZapier.json();
                    console.error(`Failed to send data to Zapier for ${participant.email}: ${sendResponseToZapier.status} - ${zapierErrorData.message}`);
                } else {
                    const zapierResponseData = await sendResponseToZapier.json();
                    console.log(`Data sent to Zapier successfully for ${participant.email}:`, zapierResponseData);
                }
            } catch (error) {
                console.error('Error creating HubSpot contact or sending data to Zapier:', error.message);
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
