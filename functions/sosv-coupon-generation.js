const WoocommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
require("dotenv").config();
const fetch = require("node-fetch");

const wooCommerce = new WoocommerceRestApi({
    url: 'https://stg.instituteofsustainabilitystudies.com',
    consumerKey: process.env.CONSUMERKEY,
    consumerSecret: process.env.CONSUMERSECRET,
    version: 'wc/v3' 
});

const generateCouponCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let couponCode = '';
    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        couponCode += characters[randomIndex];
    }
    return couponCode;
};

exports.handler = async (event) => {
    const getNetlifyKey = event.queryStringParameters.API_KEY;
    const getValidationKey = process.env.Netlify_API_KEY;

    if (getNetlifyKey === getValidationKey) {
        try {
            const bodyData = JSON.parse(event.body);
            const objectId = bodyData[0].objectId;

            const getData = await fetch(`https://api.hubapi.com/contacts/v1/contact/vid/${objectId}/profile`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${process.env.SOSVHUBSPOT_API_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            const response = await getData.json();

            if (response) {
                const getEmail = response.properties.email.value;
                const firstname = response.properties.firstname.value
                const couponCode = generateCouponCode();

                const newCoupon = {
                    code: couponCode,
                    discount_type: 'percent',
                    amount: '40', // 40% off discount
                    individual_use: true,
                    usage_limit: 1, // One-time use
                    email_restrictions: getEmail // Restrict coupon usage to the specified email
                };

                const { data: createdCoupon } = await wooCommerce.post('coupons', newCoupon);
                
                // Send the coupon to zapier for customer access
                const sendCouponToCustomer = await fetch('https://hooks.zapier.com/hooks/catch/14129819/3pj4wn2/', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ createdCoupon, firstname: firstname})
                })

                return {
                    statusCode: sendCouponToCustomer.status,
                    body: JSON.stringify({ message: 'Coupon sent via zapier webhook' })
                };
            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Failed to fetch contact data from HubSpot" })
                };
            }
        } catch (error) {
            console.log(error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Internal Server Error" })
            };
        }
    } else {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "Unauthorized Access" })
        };
    }
};
