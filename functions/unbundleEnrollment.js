exports.handler = async (event) => {

    const getNetlifyKey = event.queryStringParameters.API_KEY;
    const getValidationKey = process.env.Netlify_API_KEY;

    if (getNetlifyKey === getValidationKey) {
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Access Granted"})
        }
    } else {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "Authorized Access"})
        }
    }
}