const axios = require("axios");

exports.handler = async function (event, context) {
    try {
        const thinkificResponse = await axios.get("https://jsonplaceholder.typicode.com", 
        // {
        //     headers: {
        //         Authorization: "xxxxxxxxxxxxxxxxxx",
        //         Subdomain: "instituteofsustainabilitystudies",
        //         ContentType: "application/json"
        //     },
        // }
        );

        console.log(thinkificResponse.data);  // Access the response data directly

    } catch (error) {
        console.log(error);
    }
};
