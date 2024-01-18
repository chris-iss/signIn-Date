const axios = require("axios");

exports.handler = async function (event, context) {
    try {
        // const thinkificResponse = await axios.get("https://jsonplaceholder.typicode.com"
        // // {
        // //     headers: {
        // //         Authorization: "xxxxxxxxxxxxxxxxxx",
        // //         Subdomain: "instituteofsustainabilitystudies",
        // //         ContentType: "application/json"
        // //     },
        // // }
        // );

        const thinkificResponse = fetch("https://jsonplaceholder.typicode.com")
        .then((res) => console.log(context.res))

        thinkificResponse()

    } catch (error) {
        console.log(error);
    }
};
