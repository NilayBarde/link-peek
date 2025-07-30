import axios from "axios";

const fetchWithTimeout = async (url, timeout = 5000) => {
    try {
        const response = await axios.get(url, {
            timeout,
            headers: {
                "User-Agent": "LinkPeekBot/1.0",
                Accept: "text/html,application/xhtml+xml",
            },
        });

        const html = response.data;

        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const descriptionMatch = html.match(
            /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i
        );

        return {
            url,
            title: titleMatch ? titleMatch[1] : null,
            description: descriptionMatch ? descriptionMatch[1] : null,
            status: response.status,
        };
    } catch (err) {
        return {
            url,
            title: null,
            description: null,
            status: err.response?.status || "Error",
            error: err.message,
        };
    }
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "No URLs provided" });
    }

    const fetchPromises = urls.map((url) => fetchWithTimeout(url, 5000));

    const results = await Promise.allSettled(fetchPromises);

    const metadata = results.map((result, index) =>
        result.status === "fulfilled"
            ? result.value
            : {
                  url: urls[index],
                  title: null,
                  description: null,
                  status: "Error",
              }
    );

    return res.status(200).json(metadata);
}
