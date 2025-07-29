import puppeteer from "puppeteer";

export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });

    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "Invalid URL list" });
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const results = [];

    for (const url of urls) {
        try {
            const page = await browser.newPage();
            const response = await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 10000,
            });
            const status = response?.status() || null;

            const title = await page.title();
            const description = await page
                .$eval('meta[name="description"]', (el) => el.content)
                .catch(() => "");

            results.push({ url, title, description, status });
            await page.close();
        } catch (err) {
            results.push({ url, title: "", description: "", status: "Error" });
        }
    }

    await browser.close();
    res.status(200).json(results);
}
