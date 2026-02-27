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
    const getNetlifyKey = event.queryStringParameters?.API_KEY;
    const getValidationKey = process.env.Netlify_API_KEY;

    if (getNetlifyKey !== getValidationKey) {
      isExecuting = false;
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized Access" }),
      };
    }

    // Parse request body and check for orderId
    const requestBody = JSON.parse(event.body);
    const orderId = requestBody.orderId;
    const billingUserEmail = requestBody.billing_user_email;

    //For Xero Account & Invoice Creation
    const addressOne = requestBody.address_1;
    const addressTwo = requestBody.address_2;
    const city = requestBody.addressCity;
    const state = requestBody.state;
    const country = requestBody.country;
    const amount = requestBody.amount;
    const amount_total = requestBody.amount;
    const discount = requestBody.discount;
    const paymentintentId = requestBody.paymentIntent_Id;
    const stage_charge_url = requestBody.charge_url

    if (!orderId) {
      isExecuting = false;
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing orderId in the request body",
        }),
      };
    }

    // WooCommerce credentials
    const consumerKey = process.env.CONSUMERKEY;
    const consumerSecret = process.env.CONSUMERSECRET;
    
    let baseUrl;

    const prdUrl =
      "https://www.instituteofsustainabilitystudies.com/wp-json/wc/v3/orders";
    const stageUrl =
      "https://stage.instituteofsustainabilitystudies.com/wp-json/wc/v3/orders";


      if (stage_charge_url === "https://stage.instituteofsustainabilitystudies.com") {
        baseUrl = stageUrl
      } else {
        baseUrl = prdUrl
      }

    // Determine which environment to use
    // const baseUrl = process.env.NODE_ENV === "production" ? prdUrl : stageUrl;

    console.log("WHAT URL IS RUNNING:", baseUrl)

    if (!consumerKey || !consumerSecret) {
      isExecuting = false;
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Missing WooCommerce credentials" }),
      };
    }

    let buyerBillingData;
    let courses = [];
    let courseType = [];
    let countsArray;

    // Step 1: Fetch order details from WooCommerce
    const getOrderDetails = async () => {
      const url = `${baseUrl}/${orderId}`;
      const auth =
        "Basic " +
        Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: auth,
          },
        });

        if (!response.ok) {
          const errorDetails = await response.text();
          throw new Error(
            `Error fetching order details: ${response.status} - ${response.statusText} - ${errorDetails}`
          );
        }

        const data = await response.json();

        buyerBillingData = data;

        // Extract specific metadata from order details
        const keysToExtract = [
          "name_",
          "email_",
          "name2_",
          "email2_",
          "name3_",
          "email3_",
        ];
        const extractedData = data.meta_data
          .filter((meta) => keysToExtract.includes(meta.key))
          .map((meta) => ({ key: meta.key, value: meta.value }));

        console.log("EXTRACTED-DATA", extractedData);

        
        // Mapping of course names to Thinkific course IDs
        const moduleCourseIdMap = {
          "Certificate in Business Sustainability": "2755212",
          "Certificate in Sustainability Plan Development": "2755219",
          "Certificate in Sustainability Plan Implementation": "2755224",
          "Certificate in Decarbonisation: Achieving Net Zero": "2755233",
          "Certificate in Circular Economy": "2755243",
          "Certificate in Business with Biodiversity": "2755260",
          "Certificate in Diversity Equity and Inclusion": "2755264",
          "Certificate in Sustainable Finance": "2755272",
          "Certificate in Sustainable Business Operations": "2755276",
          "Certificate in Sustainable Supply Chain": "2755278",
          "Certificate in Green Marketing": "2755281",
          "Certificate in ESG Reporting and Auditing": "2755283",
          "Certificate in Corporate Sustainability Reporting Directive (CSRD)":
            "2730358",
          "Certificate in Corporate Sustainability Reporting Directive (CSRD) - Free":
            "2730358",
          "Diploma in Business Sustainability": "2622273",
        };

       // Function to determine if course is Unbundled or Diploma or even both
       const diplomaCourse = "Diploma in Business Sustainability";
       const membershipCourse = "ISS Professional Membership - (12 months access)";

       data.line_items.forEach((item) => {
          if (item.name !== membershipCourse) {
            courses.push(item.name);
          }
        });


        // Holds course ID
        const selectedCourseIds = [];

        // Select course IDs based on the courses bought
        courses.forEach((course) => {
          if (moduleCourseIdMap.hasOwnProperty(course)) {
            selectedCourseIds.push(moduleCourseIdMap[course]);
          } else {
            console.log(`Course ID not found for '${course}'`);
          }
        });

        console.log("Enrolling user with course IDs:", selectedCourseIds);

      // ✅ Remove membership before any logic
      const filteredCourses = courses.filter(course => course !== membershipCourse);

      const hasDiploma = filteredCourses.includes(diplomaCourse);

      // ✅ Remove membership + diploma for unbundled check
      const unbundledCourses = filteredCourses.filter(course => course !== diplomaCourse);

      if (hasDiploma) {
        courseType.push("Diploma");
      }

      if (unbundledCourses.length > 0) {
        courseType.push("Unbundled");
      }

        // Create a new array to hold the counts
        countsArray = [
          `Unbundled: ${unbundledCourses.length}`,
          `Diploma: ${hasDiploma ? 1 : 0}`,
        ];

        console.log("NO of Unbundled Selected:", unbundledCourses.length);
        console.log("NO of Diploma Selected:", hasDiploma ? 1 : 0);

        return { extractedData, selectedCourseIds };
      } catch (error) {
        console.error("Fetch error:", error.message);
        throw error;
      }
    };

    const { extractedData, selectedCourseIds } = await getOrderDetails();

    let thinkificUserId;

    // Format Participants Payload
    const participants = [];
    for (let i = 1; i <= 3; i++) {
      const nameKey = `name${i === 1 ? "_" : i + "_"}`;
      const emailKey = `email${i === 1 ? "_" : i + "_"}`;

      const name = extractedData.find((item) => item.key === nameKey)?.value;
      const email = extractedData.find((item) => item.key === emailKey)?.value;

      if (name && email) {
        const [firstName, lastName] = name.split(" ");
        participants.push({ firstName, lastName, email });
      }
    }

    //This function is used to create Xero contacts, Invoices and payment in Xero
    await fetch("https://hooks.zapier.com/hooks/catch/14129819/22s08uv/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selectedCourses: courses,
        selectdCoursesType: courseType,
        selectedCourseCout: countsArray,
        firstname: buyerBillingData.billing.first_name,
        lastname: buyerBillingData.billing.last_name,
        email: billingUserEmail,
        currency: requestBody.currency,
        startDate: requestBody.startDate,
        unbundledSkuCode: requestBody.unbundledSkuCode || null,
        diplomaSkuCode: requestBody.diplomaSkuCode || null,
        orderId: orderId,
        addresss_1: addressOne || null,
        address_2: addressTwo || null,
        city: city || null,
        state: state || null,
        country: country || null,
        amount: amount || null,
        amount_total: amount_total || null,
        discount: discount || null,
        paymentintent: paymentintentId || null,
        prdUrl: prdUrl,
      }),
    });

    await fetch("https://hooks.zapier.com/hooks/catch/14129819/2dah57x/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selectedCourses: courses,
        selectdCoursesType: courseType,
        selectedCourseCout: countsArray,
        firstname: buyerBillingData.billing.first_name,
        lastname: buyerBillingData.billing.last_name,
        email: billingUserEmail,
        currency: requestBody.currency,
        startDate: requestBody.startDate,
        unbundledSkuCode: requestBody.unbundledSkuCode || null,
        diplomaSkuCode: requestBody.diplomaSkuCode || null,
        orderId: orderId,
        addresss_1: addressOne || null,
        address_2: addressTwo || null,
        city: city || null,
        state: state || null,
        country: country || null,
        amount: amount || null,
        amount_total: amount_total || null,
        discount: discount || null,
        paymentintent: paymentintentId || null,
        prdUrl: prdUrl,
      }),
    });




    // Step 2: If participant array is empty: BNP === Participant is Buyer
    if (participants.length === 0) {
      console.log(
        `Participant is Buyer - Firstname: ${buyerBillingData.billing.first_name}, lastName: ${buyerBillingData.billing.last_name}, Email: ${buyerBillingData.billing.email}`
      );

      // Function to create Thinkific user or fetch existing user ID
      const getOrCreateThinkificUser = async (firstName, lastName, email) => {
        try {
          // Check if the user already exists
          const existingUserResponse = await fetch(
            `https://api.thinkific.com/api/public/v1/users?query[email]=${email}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
                "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
              },
            }
          );

          if (!existingUserResponse.ok) {
            throw new Error(
              `Failed to check Thinkific user: ${existingUserResponse.status} - ${existingUserResponse.statusText}`
            );
          }

          const existingUserData = await existingUserResponse.json();

          if (existingUserData.items.length > 0) {
            // User already exists
            const existingUserId = existingUserData.items[0].id;
            console.log(`Thinkific user already exists: ${existingUserId}`);
            return existingUserId;
          } else {
            // Create a new user
            const createUserResponse = await fetch(
              "https://api.thinkific.com/api/public/v1/users",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
                  "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
                },
                body: JSON.stringify({
                  first_name: firstName,
                  last_name: lastName,
                  email: email,
                }),
              }
            );

            if (!createUserResponse.ok) {
              const errorData = await createUserResponse.json();
              console.error(
                `Failed to create Thinkific user: ${
                  createUserResponse.status
                } - ${JSON.stringify(errorData)}`
              );
              throw new Error(
                `Failed to create Thinkific user: ${createUserResponse.status} - ${errorData.message}`
              );
            }

            const newUser = await createUserResponse.json();
            console.log(`Thinkific user created successfully: ${newUser.id}`);
            return newUser.id;
          }
        } catch (error) {
          console.error(
            `Error getting or creating Thinkific user: ${error.message}`
          );
          throw error;
        }
      };

      try {
        const userId = await getOrCreateThinkificUser(
          buyerBillingData.billing.first_name,
          buyerBillingData.billing.last_name,
          billingUserEmail
        );

        for (const courseId of selectedCourseIds) {
          console.log(`Enrollment:, courseId: ${courseId} userId: ${userId}`);

          const thinkificCourseId = courseId;

          // This is for the New System turned On
          await fetch(
            "https://hooks.zapier.com/hooks/catch/14129819/251ydr7/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                selectedCourses: courses,
                selectdCoursesType: courseType,
                selectedCourseCout: countsArray,
                thinkificCourseId: thinkificCourseId,
                thnkificUserId: userId,
                firstname: buyerBillingData.billing.first_name,
                lastname: buyerBillingData.billing.last_name,
                email: billingUserEmail,
                currency: requestBody.currency,
                startDate: requestBody.startDate,
                unbundledSkuCode: requestBody.unbundledSkuCode,
                diplomaSkuCode: requestBody.diplomaSkuCode,
                BNP: "No",
              }),
            }
          );
        }

        // Create or update contact in HubSpot
        const hubSpotResponse = await fetch(
          "https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/" +
            encodeURIComponent(billingUserEmail),
          {
            method: "POST",
            headers: {
              AUTHORIZATION: `Bearer ${process.env.HUBSPOT_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              properties: [
                {
                  property: "firstname",
                  value: buyerBillingData.billing.first_name,
                },
                {
                  property: "lastname",
                  value: buyerBillingData.billing.last_name,
                },
                { property: "email", value: billingUserEmail },
              ],
            }),
          }
        );

        if (!hubSpotResponse.ok) {
          const errorDetails = await hubSpotResponse.text();
          throw new Error(
            `Failed to create/update HubSpot contact: ${hubSpotResponse.status} - ${hubSpotResponse.statusText} - ${errorDetails}`
          );
        }

        console.log("HubSpot contact created/updated successfully");
      } catch (error) {
        console.error(
          "Error creating HubSpot contact, enrolling in Thinkific, or sending data to Zapier:",
          error.message
        );
      }

      console.log("Processed buyerInfo:", buyerBillingData);
    }




    ///////////////////// Buyer is buying for Participant Function ///////////////////////////////

    // Step 3: Participants array isn't empty
    if (participants.length > 0) {

      //Function to update buyer not participant_ contact property to Yes and Order Id
      await fetch("https://hooks.zapier.com/hooks/catch/14129819/2blsx1o/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: billingUserEmail,
          orderId: orderId,
          startDate: requestBody.startDate,
          unbundledSkuCode: requestBody.unbundledSkuCode || null,
          diplomaSkuCode: requestBody.diplomaSkuCode || null,
          setBuyerNotParticipant: "Yes",
        }),
      });

      // Function to create Thinkific user or fetch existing user ID
      const getOrCreateThinkificUser = async (firstName, lastName, email) => {
        try {
          // Check if the user already exists
          const existingUserResponse = await fetch(
            `https://api.thinkific.com/api/public/v1/users?query[email]=${email}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
                "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
              },
            }
          );

          if (!existingUserResponse.ok) {
            throw new Error(
              `Failed to check Thinkific user: ${existingUserResponse.status} - ${existingUserResponse.statusText}`
            );
          }

          const existingUserData = await existingUserResponse.json();

          if (existingUserData.items.length > 0) {
            // User already exists
            const existingUserId = existingUserData.items[0].id;
            console.log(`Thinkific user already exists: ${existingUserId}`);
            return existingUserId;
          } else {
            // Create a new user
            const createUserResponse = await fetch(
              "https://api.thinkific.com/api/public/v1/users",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
                  "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
                },
                body: JSON.stringify({
                  first_name: firstName,
                  last_name: lastName,
                  email: email,
                }),
              }
            );

            if (!createUserResponse.ok) {
              const errorData = await createUserResponse.json();
              console.error(
                `Failed to create Thinkific user: ${
                  createUserResponse.status
                } - ${JSON.stringify(errorData)}`
              );
              throw new Error(
                `Failed to create Thinkific user: ${createUserResponse.status} - ${errorData.message}`
              );
            }

            const newUser = await createUserResponse.json();
            console.log(`Thinkific user created successfully: ${newUser.id}`);
            return newUser.id;
          }
        } catch (error) {
          console.error(
            `Error getting or creating Thinkific user: ${error.message}`
          );
          throw error;
        }
      };

      for (const participant of participants) {
        const userId = await getOrCreateThinkificUser(
          participant.firstName,
          participant.lastName,
          participant.email
        );

        for (const courseId of selectedCourseIds) {
          console.log(
            `Enrolling participant: ${participant.email}, courseId: ${courseId} userId: ${userId}`
          );

          const thinkificCourseId = courseId;

          await fetch(
            "https://hooks.zapier.com/hooks/catch/14129819/2igsms6/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                selectedCourses: courses,
                selectdCoursesType: courseType,
                selectedCourseCout: countsArray,
                thinkificCourseId: thinkificCourseId,
                thnkificUserId: userId,
                firstname: participant.firstName,
                lastname: participant.lastName,
                email: participant.email,
                currency: requestBody.currency,
                startDate: requestBody.startDate,
                unbundledSkuCode: requestBody.unbundledSkuCode,
                diplomaSkuCode: requestBody.diplomaSkuCode,
                orderId: orderId,
                BNP: "Yes",
              }),
            }
          );
        }

        // Create or update contact in HubSpot
        const hubSpotResponse = await fetch(
          "https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/" +
            encodeURIComponent(participant.email),
          {
            method: "POST",
            headers: {
              AUTHORIZATION: `Bearer ${process.env.HUBSPOT_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              properties: [
                { property: "firstname", value: participant.firstName },
                { property: "lastname", value: participant.lastName },
                { property: "email", value: participant.email },
              ],
            }),
          }
        );

        if (!hubSpotResponse.ok) {
          const errorDetails = await hubSpotResponse.text();
          throw new Error(
            `Failed to create/update HubSpot contact: ${hubSpotResponse.status} - ${hubSpotResponse.statusText} - ${errorDetails}`
          );
        }

        console.log(
          "HubSpot contact created/updated successfully for participant:",
          participant.email
        );
      }

      console.log("Processed participants:", participants);
    }

    isExecuting = false;
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
        participants,
        selectedCourseIds,
      }),
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
