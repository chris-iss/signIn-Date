const { promises } = require("dns");
const fetch = require("node-fetch");
require("dotenv").config();

// Helper function to introduce delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.handler = async (event, context) => {
    
  try {
    const thinkificEnrolmentUrl = `https://api.thinkific.com/api/public/v1/enrollments`;
    const hubspotBaseURL = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

    let filteredCourseEnrollments = [];
    let extractUserEnrolmentEmails = [];
    let nextPage = 1;

    // Step 1: Fetch all enrollments from Thinkific
    while (nextPage) {
      try {
        const thinkificEnrolmentRequest = await fetch(
          `${thinkificEnrolmentUrl}?page=${nextPage}`,
          {
            method: "GET",
            headers: {
              "X-Auth-API-Key": process.env.THINKIFIC_API_KEY,
              "X-Auth-Subdomain": process.env.THINKIFIC_SUB_DOMAIN,
              "Content-Type": "application/json",
            },
          }
        );

        if (!thinkificEnrolmentRequest.ok) {
          throw new Error(`Thinkific API Error: ${thinkificEnrolmentRequest.status} - ${thinkificEnrolmentRequest.statusText}`);
        }
        
        // Response from thinkific course enrolment api call
        const thinkificEnrolmentResponse = await thinkificEnrolmentRequest.json();

        // Filter enrollments based on the desired course name
        const enrollmentsForCourse = thinkificEnrolmentResponse.items.filter(
          (enrollment) =>
            enrollment.course_name === "Diploma in Business Sustainability 2024" || enrollment.course_name === "Certificate in Business Sustainability 2024"
        );

        // Append the filtered enrollments to the array
        filteredCourseEnrollments = filteredCourseEnrollments.concat(enrollmentsForCourse);

        // Update the nextPage value for the next iteration
        nextPage = thinkificEnrolmentResponse.meta.pagination.next_page;
      } catch (error) {
        console.error("Error during Thinkific API request:", error.message);
      }
    }

    // Step 2: Extract user emails
    await Promise.all(
      filteredCourseEnrollments.map((email) => {
        if (email) extractUserEnrolmentEmails.push(email.user_email);
      })
    );


    // Step 3: Search for the contact on HubSpot using the email from users registered on a course in Thinkific
    const searchHubspot = async (__email) => {
      try {
        // Search property
        const hubspotSearchProperties = {
          after: "0",
          filterGroups: [
            { filters: [{ operator: "EQ", propertyName: "email", value: __email }] },
            { filters: [{ operator: "EQ", propertyName: "hs_additional_emails", value: __email }] },
          ],
          limit: "100",
          properties: ["email", "thinkific_access_date", "id"], // Include id for updating
          sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
        };

        const searchContact = await fetch(hubspotBaseURL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(hubspotSearchProperties),
        });

        // Introduced a delay here to comply with rate limits of hubspot
        await delay(1000); 
        
        // Response from hubspot contact search by email
        const hubspotContactResponse = await searchContact.json();
        
        
        if (hubspotContactResponse.results) {
          // Update each HubSpot contact with the appropriate access_date from Thinkific
          for (const result of hubspotContactResponse.results) {
            
            const thinkificEnrollment = filteredCourseEnrollments.find(
              (enrollment) => enrollment.user_email === result.properties.email
            );

            let expiryDate;

            //Calculate the thinkific expiry date and update it on thinkific  (WORK ON THIS LATER)
            if (thinkificEnrollment.started_at && !isNaN(new Date(thinkificEnrollment.started_at))) {
                const startedAtDate = new Date(thinkificEnrollment.started_at);

                if (!isNaN(startedAtDate)) {
                    expiryDate = new Date(thinkificEnrollment.started_at);
                    expiryDate.setMonth(startedAtDate.getMonth() + 12)
                }
            }
        

            // Update contact property with the startedAt date and Thinkific ExpiryDate
            const accessDateContactPropertyUpdate = {
                "properties": {
                    "thinkific_access_date": thinkificEnrollment.started_at,
                    "thinikific_user_expirydate": expiryDate
                }
            }

            if (thinkificEnrollment) {
                // await updateHubspotContact(result.id, accessDateContactPropertyUpdate, thinkificEnrollment);
                await updateThinkificExpiryDate(thinkificEnrollment.id, expiryDate)
            }
          }
        } else {
          console.log("HUBSPOT RESPONSE++ Undefined");
        }
      } catch (error) {
        console.error("Error during HubSpot API request:", error.message);
      }
    };


    // Update thinkific expiry date
    const updateThinkificExpiryDate = async (expirt_id, expiryDtate) => {
      
    }


    // Step 4: Update HubSpot contact with the appropriate access_date from Thinkific
    // const updateHubspotContact = async (contactId, accessDateExpiryDateProperty, thinkificEnrolmentData) => {
        
    //     //Convert tthe date to the format hubspot understands
    //     if (accessDateExpiryDateProperty.properties.thinkific_access_date && accessDateExpiryDateProperty.properties.thinikific_user_expirydate ) {
    //         accessDateExpiryDateProperty.properties.thinkific_access_date = new Date(accessDateExpiryDateProperty.properties.thinkific_access_date).toISOString().split('T')[0];
    //         accessDateExpiryDateProperty.properties.thinikific_user_expirydate = new Date(accessDateExpiryDateProperty.properties.thinikific_user_expirydate).toISOString().split('T')[0];
    //     }

        
    //    try {
    //     const updateContactURL = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;

    //     const updateContact = await fetch(updateContactURL, {
    //       method: "PATCH",
    //       headers: {
    //         Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
    //         "Content-Type": "application/json",
    //       },
    //       body: JSON.stringify( accessDateExpiryDateProperty ),
    //     });

    //     const updateContactResponse = await updateContact.json();
    //     console.log("HubSpot Contact Update Response:", updateContactResponse);
    //   } catch (error) {
    //     console.error("Error during HubSpot contact update:", error.message);
    //     const TriggerZapier = await fetch(`${process.env.URL_ZAPIERWEBHOOKCONTACT}`, {
    //         method: "POST",
    //         body: JSON.stringify({
    //             endpoint: "New Sign In",
    //             message: "Hubspot User Error: Unable to Update Contact",
    //             errorMessage: error.message,
    //             studentEmail: thinkificEnrolmentData.user_email,
    //             contactId: contactId,
    //             signInDate: thinkificEnrolmentData.started_at
    //         })
    //     });

    //     console.log("Hubspot Contact Thinkific Acess Date Update Error:", TriggerZapier.json())
    //   }
    // };

    // Step 5: Loop through user emails and update HubSpot
    // for (const _email of extractUserEnrolmentEmails) {
    //   await searchHubspot(_email);
    // }

    return {
      statusCode: 200,
      body: JSON.stringify(filteredCourseEnrollments),
    };
  } catch (error) {
    console.error("Error in the main function:", error.message);
  }
};
