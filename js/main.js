

const getResponse = async () => {
    try {
        
        const url = "/.netlify/functions/syncData"
        const response = await fetch(url)
        await response.json();
        
    } catch (error) {
        console.error("Fetch error:", error);
    }
};

getResponse();
