const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

let isExecuting = false;

exports.handler = async (event, context) => {
    
    if (isExecuting) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "Function is already executing"})
        }
    }

    isExecuting = true;

    try {
        const getNetlifyKey = event.queryStringParameters.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;
        console.log("KEYS", getNetlifyKey, getValidationKey)

        if (getNetlifyKey === getValidationKey) {
            
                const bodyData = JSON.parse(event.body);
                const formatPayload = bodyData[0]
                console.log("BODY", bodyData)
                const fetchObjectId = formatPayload.objectId;
                console.log("BODY OBJECT ID", fetchObjectId)
                let enrolUserId;
                let userData;
                
                // Function to sign into Thinkific
                const signIntoThinkific = (user) => {
                    const iat = Math.floor(Date.now() / 1000);
                    const jti = `${iat}/${crypto.randomBytes(9).toString('hex')}`;

                    const payload = {
                        iat: iat,
                        jti: jti,
                        first_name: user.firstname,
                        last_name: user.lastname,
                        email: user.email
                    };

                    // Sign jwt Token
                    const token = jwt.sign(payload, process.env.THINKIFIC_SUB_DOMAIN)

                    let url = `https://${process.env.THINKIFIC_SUB_DOMAIN}.thinkific.com/api/sso/v2/sso/jwt?jwt=${token}`;
                    
                    return url;
                }


                const createOrEnrolStudent = async (userData) => {
                    try {
                        //check if user exist in thinkific
                        const userRequest = await fetch(`https://api.thinkific.com/api/public/v1/users/email:${userData.email}`, {
                            method: "GET",
                            headers: {
                                "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
                                "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
                                "Content-Type": "application/json"
                            }
                        });  

                        const userExistData = await userRequest.json();
                        
                        if (userExistData.error === "Record not found") {

                             // User doesn't exist, create the user
                            const createThinkificUser = async () => {
                                
                                const createUser = await fetch("https://api.thinkific.com/api/public/v1/users", {
                                    method: "POST",
                                    headers: {
                                        "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
                                        "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        "first_name": userData.firstname,
                                        "last_name": userData.lastname,
                                        "email": userData.email  
                                    })
                                })

                                const createUserResponse = await createUser.json();
                                enrolUserId = createUserResponse.id
                                
                            }

                            await createThinkificUser();


                            // Enroll the user in the course
                            const enrolUserCourseRequest = async () => {
                                const enrolUser = await fetch("https://api.thinkific.com/api/public/v1/enrollments", {
                                    method: "POST",
                                    headers: {
                                        "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
                                        "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        "course_id": 2573444,
                                        "user_id": enrolUserId
                                    })
                                })

                                const enrolUserResponse = await enrolUser.json();
                                console.log("ENROLLED USER", enrolUserResponse)

                                const redirectUrl = signIntoThinkific(userData);

                                await sendRedirecctLinkToWebhook(userData.email, redirectUrl);
                            }

                            await enrolUserCourseRequest()
                        } else {
                            //user alreeady exist
                            return {
                                statusCode: 409,
                                body: JSON.stringify({ message: "User Already exists"})
                            }
                        }
                    } catch (error) {
                        throw new Error(`Error creating or retrieving user: ${error.message}`);
                    }
                };
                
                
                // Function to send redirect URL to webhook
                const sendRedirecctLinkToWebhook = async (email, redirectUrl) => {
                    try {
                        const webhookPayload = {
                            endpoint: "https://hooks.zapier.com/hooks/catch/14129819/3lpalce/",
                            message: "New user Enrolled",
                            email: email,
                            redirectUrl: redirectUrl
                        }

                        const webhookResponse = await fetch("https://hooks.zapier.com/hooks/catch/14129819/3lpalce/", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(webhookPayload)
                        });
                        
                        if (!webhookResponse.ok) {
                            throw new Error(`Failed to send redirect URL to webhook. Status: ${webhookResponse.status}`);
                        }
                    } catch(error) {
                        throw new Error(`Error sending redirect URL to webhook. Status: ${error.message}`);
                    }
                }


                // Fetch contact from HubSpot after form submission
                const fetchContact = async () => {
                    try {
                        const hubspotContact = await fetch(`https://api.hubapi.com/contacts/v1/contact/vid/${fetchObjectId}/profile`, {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
                                "Content-Type": "application/json"
                            }
                        });

                        const hubspotContactResponse = await hubspotContact.json();
                        let getProperties = hubspotContactResponse.properties || {};
                        
                        userData = {
                            course_id: `${process.env.COURSE_ID}`,
                            firstname: getProperties.firstname ? getProperties.firstname.value : null,
                            lastname: getProperties.lastname ? getProperties.lastname.value : null,
                            email: getProperties.email ? getProperties.email.value : null,
                            phone: getProperties.phone ? getProperties.phone.value : null
                        };

                        await createOrEnrolStudent(userData);
                    } catch (error) {
                        throw new Error(`Error fetching contact: ${error.message}`);
                    }
                };

                await fetchContact();
    

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Access Authorized" }),
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "UnAuthorized Access"})
            };
        }
    } catch(error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message})
        };
    } finally {
        isExecuting = false;
    }
};
