

const getResponse = async () => {
    try {
        
        const url = "/.netlify/functions/syncData"
        const response = await fetch(url)
        const jsonData = await response.json();
        jsonData()  
    } catch (error) {
        console.error("Fetch error:", error);
    }
};

getResponse();
