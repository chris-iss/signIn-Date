exports.handler = async (event) => {
    let isExecuting = false;

    if (isExecuting) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "Function is already executing" }),
        };
    }

    isExecuting = true;

    try {
        const startTime = Date.now();

        // Validate API key
        const getNetlifyKey = event.queryStringParameters?.API_KEY;
        const getValidationKey = process.env.Netlify_API_KEY;

        if (getNetlifyKey !== getValidationKey) {
            console.error("Unauthorized Access: Invalid API Key");
            isExecuting = false;
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized Access" }),
            };
        }

        // Validate request body
        if (!event.body) {
            console.error("Empty body received");
            isExecuting = false;
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Request body is empty or missing" }),
            };
        }

        const requestBody = JSON.parse(event.body);

        // Extract data from request
        const fName = requestBody.billing.first_name;
        const lastName = requestBody.billing.last_name;
        const course = requestBody.line_items[0]?.name;
        const quantity = requestBody.line_items[0]?.quantity;
        const amount = requestBody.line_items[0]?.subtotal;
        const status = requestBody.status;
        const date = new Date();

        // Connect to MongoDB
        // const db = await connectToDatabase();
        // const collection = db.collection(process.env.MONGODB_COLLECTION);

        // // Insert data into MongoDB
        // const insertResult = await collection.insertOne({
        //     firstname: fName,
        //     lastname: lastName,
        //     course: course,
        //     quantity: quantity,
        //     amount: amount,
        //     status: status,
        //     date: date,
        // });

        console.log("Data inserted in MongoDB in:", requestBody);

        // Return success response
        isExecuting = false;
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success" }),
        };
    } catch (error) {
        console.error("Error processing data:", error.message);

        // Reset execution flag
        isExecuting = false;

        // Return error response
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
