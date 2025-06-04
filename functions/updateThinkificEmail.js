const fetch = require("node-fetch");
require("dotenv").config();

let isExecuting = false;

exports.handler = async (event) => {
  if (isExecuting) {
    return {
      statusCode: 409,
      body: JSON.stringify({ message: "Function is already executing" }),
    };
  }

  isExecuting = true;

  try {
    // Validate API key
    const apiKey = event.queryStringParameters?.API_KEY;
    const validApiKey = process.env.Netlify_API_KEY;

    if (apiKey !== validApiKey) {
      isExecuting = false;
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized Access" }),
      };
    }

    // Parse request body
    const requestBody = JSON.parse(event.body);
    console.log("DATA:", requestBody)
    // const {
    //   orderId,
    //   currency,
    //   startDate,
    //   unbundledSkuCode,
    //   diplomaSkuCode,
    //   addressOne,
    //   addressTwo,
    //   city,
    //   state,
    //   country,
    //   amount,
    //   amount_total,
    //   discount,
    //   paymentintentId,
    //   prdUrl,
    //   buyerBillingData,
    //   billingUserEmail,
    //   courses,
    //   courseType,
    //   countsArray
    // } = requestBody;

    // Send data to Zapier for further processing (e.g. Xero, Thinkific, HubSpot)
    // await fetch("https://hooks.zapier.com/hooks/catch/14129819/22s08uv/", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     selectedCourses: courses,
    //     selectdCoursesType: courseType,
    //     selectedCourseCout: countsArray,
    //     firstname: buyerBillingData?.billing?.first_name,
    //     lastname: buyerBillingData?.billing?.last_name,
    //     email: billingUserEmail,
    //     currency,
    //     startDate,
    //     unbundledSkuCode: unbundledSkuCode || null,
    //     diplomaSkuCode: diplomaSkuCode || null,
    //     orderId,
    //     addresss_1: addressOne || null,
    //     address_2: addressTwo || null,
    //     city: city || null,
    //     state: state || null,
    //     country: country || null,
    //     amount: amount || null,
    //     amount_total: amount_total || null,
    //     discount: discount || null,
    //     paymentintent: paymentintentId || null,
    //     prdUrl: prdUrl || null,
    //   }),
    // });

    // console.log("Zapier webhook triggered successfully");

    isExecuting = false;
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };
  } catch (error) {
    console.error("Error processing data:", error.message);
    isExecuting = false;
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
