const PACKETS_URL = `${process.env.CHARS_URL}/chars`;

export async function sendPostRequest(url: string, data: unknown) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Specify the content type as JSON
      },
      body: JSON.stringify(data), // Convert the JavaScript object to a JSON string
    });

    if (response.ok) {
      const jsonResponse = await response.json();
      console.log("Success:", jsonResponse);
    } else {
      console.error("HTTP Error:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("Network Error:", error);
  }
}

// get request
export async function sendGetRequest(url: string) {
  try {
    const response = await fetch(url);

    if (response.ok) {
      const jsonResponse = await response.json();
      console.log("Success:", jsonResponse);
    } else {
      console.error("HTTP Error:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("Network Error:", error);
  }
}

export const getCharPacketById = async (id: number) => {
  const response = await fetch(`${PACKETS_URL}/${id}`);
  return response.json();
};
