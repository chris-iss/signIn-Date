

const getResponse = async () => {
    try {
        
        const url = "/.netlify/functions/function"
        const response = await fetch(url)
        await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
    }
};

getResponse();



 // // 3.4 - Function to fetch user in Thinkific 
            // const enrollInThinkificCourse = async (courseId, userId) => {
            //     const url = 'https://api.thinkific.com/api/public/v1/enrollments';
            //     const response = await fetch(url, {
            //         method: 'POST',
            //         headers: {
            //             'Content-Type': 'application/json',
            //             'X-Auth-API-Key': process.env.THINKIFIC_API_KEY,
            //             'X-Auth-Subdomain': process.env.THINKIFIC_SUB_DOMAIN
            //         },
            //         body: JSON.stringify({
            //             course_id: courseId,
            //             user_id: userId,
            //             activated_at: new Date().toISOString(),
            //             expiry_date: null
            //         })
            //     });

            //     if (!response.ok) {
            //         const errorData = await response.json();
            //         throw new Error(`Failed to enroll in Thinkific course: ${response.status} - ${errorData.message}`);
            //     }

            //     const data = await response.json();
            //     console.log(`User enrolled in Thinkific course successfully: ${courseId}`);
            //     return data;
            // };