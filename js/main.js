

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
