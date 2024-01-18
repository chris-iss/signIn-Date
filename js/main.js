const url = "https://api.chucknorris.io/jokes/random";

const getResponse = async () => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        const h1 = document.querySelector("h1");
        h1.textContent =  jsonData.value
        
    } catch (error) {
        console.error("Fetch error:", error);
    }
};

getResponse();
