const fetch = require("node-fetch");

exports.handler = async (event, context) => {
    const url = "https://api.chucknorris.io/jokes/random";

    try {
      const getJokes = await fetch(url, {
        headers: {
            "Content-Type": "application/json"
        }
      });

      const jsonJoke = await getJokes.json();
      return {
        statusCode: 200,
        body: JSON.stringify(jsonJoke)
      }

    } catch (error) {
        console.log(error.message)
        return {
            statusCode: 422,
            body: error.message
        }
    }
};
