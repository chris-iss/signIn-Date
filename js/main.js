

const getResponse = async () => {
    try {
        
        const url = "/.netlify/functions/syncData"
        const response = await fetch(url)
        const jsonData = await response.json();
        console.log(jsonData)
        const h1 = document.querySelector("h1");
        h1.textContent =  jsonData.value
        
    } catch (error) {
        console.error("Fetch error:", error);
    }
};

getResponse();
