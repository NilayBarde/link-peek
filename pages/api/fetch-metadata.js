import * as cheerio from "cheerio";
import axios from "axios";

export default async function handler(req, res) {
    const { urls } = req.body;

    if (!Array.isArray(urls)) {
        return res.status(400).json({ error: "Invalid URL list" });
    }

    const results = await Promise.all(
        urls.map(async (url) => {
            try {
                const { data: html } = await axios.get(url, {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                            "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
                        Accept: "text/html",
                    },
                });

                const $ = cheerio.load(html);

                const getMeta = (name) =>
                    $(`meta[property="${name}"]`).attr("content") ||
                    $(`meta[name="${name}"]`).attr("content");

                const title =
                    getMeta("og:title") ||
                    $("title").text().trim() ||
                    "No title found";

                const description =
                    getMeta("og:description") || getMeta("description") || "";

                const image =
                    getMeta("og:image") || $("img").first().attr("src") || "";

                return { url, title, description, image };
            } catch (err) {
                console.error(`Error fetching ${url}:`, err.message);
                return {
                    url,
                    title: "No title found",
                    description: "",
                    image: "",
                };
            }
        })
    );

    res.status(200).json(results);
}
