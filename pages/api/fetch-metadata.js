import * as cheerio from "cheerio";

// Helper function to resolve relative URLs
const resolveUrl = (url, base) => {
    try {
        return new URL(url, base).href;
    } catch {
        return url;
    }
};

// Helper function to validate and filter images
const validateImage = (imageUrl, baseUrl) => {
    if (!imageUrl) return null;

    const fullUrl = resolveUrl(imageUrl, baseUrl);

    const invalidPatterns = [
        /\.svg$/i,
        /spacer|blank|pixel|1x1|tracking/i,
        /facebook\.com\/tr/i,
        /google-analytics/i,
        /googletagmanager/i,
    ];

    if (invalidPatterns.some((pattern) => pattern.test(fullUrl))) {
        return null;
    }

    return fullUrl;
};

// Enhanced metadata extraction
const extractMetadata = async (url, html) => {
    const $ = cheerio.load(html);

    const getMeta = (...selectors) => {
        for (const selector of selectors) {
            const content = $(selector).attr("content");
            if (content && content.trim()) return content.trim();
        }
        return null;
    };

    const title =
        getMeta(
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'meta[name="title"]'
        ) ||
        $("title").text().trim() ||
        $("h1").first().text().trim() ||
        "No title found";

    const description =
        getMeta(
            'meta[property="og:description"]',
            'meta[name="twitter:description"]',
            'meta[name="description"]'
        ) ||
        $("p").first().text().trim().substring(0, 200) ||
        "";

    let image = getMeta(
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]'
    );

    if (!image) {
        const contentImages = $("img").toArray();
        for (const img of contentImages) {
            const src = $(img).attr("src");
            if (src && !src.includes("logo") && !src.includes("icon")) {
                image = src;
                break;
            }
        }
    }

    image = validateImage(image, url);

    const siteName =
        getMeta(
            'meta[property="og:site_name"]',
            'meta[name="application-name"]'
        ) || new URL(url).hostname.replace("www.", "");

    const favicon = resolveUrl(
        $('link[rel="icon"]').attr("href") ||
            $('link[rel="shortcut icon"]').attr("href") ||
            "/favicon.ico",
        url
    );

    const type = getMeta('meta[property="og:type"]') || "website";

    return {
        url,
        title: title.length > 100 ? title.substring(0, 100) + "..." : title,
        description:
            description.length > 300
                ? description.substring(0, 300) + "..."
                : description,
        image,
        siteName,
        favicon,
        type,
        success: true,
    };
};

// Process single URL
const processSingleUrl = async (url) => {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            redirect: "follow",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                DNT: "1",
                Connection: "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return await extractMetadata(url, html);
    } catch (err) {
        console.error(`Error fetching ${url}:`, err.message);

        const errorType =
            err.name === "AbortError"
                ? "TIMEOUT"
                : err.name === "TypeError"
                ? "NETWORK_ERROR"
                : err.message.includes("HTTP 404")
                ? "404"
                : err.message.includes("HTTP 403")
                ? "403"
                : err.message.includes("HTTP 500")
                ? "500"
                : "UNKNOWN";

        return {
            url,
            title: "Failed to load",
            description: `Error: ${
                errorType === "TIMEOUT"
                    ? "Request timeout"
                    : errorType === "NETWORK_ERROR"
                    ? "Network error"
                    : errorType === "404"
                    ? "Page not found"
                    : errorType === "403"
                    ? "Access forbidden"
                    : errorType === "500"
                    ? "Server error"
                    : "Unable to fetch"
            }`,
            image: null,
            siteName: new URL(url).hostname.replace("www.", ""),
            favicon: null,
            type: "error",
            success: false,
            error: errorType,
        };
    }
};

export default async function handler(req, res) {
    const { urls, batch = false, batchIndex = 0 } = req.body;

    if (!Array.isArray(urls)) {
        return res.status(400).json({ error: "Invalid URL list" });
    }

    if (urls.length > 50) {
        return res
            .status(400)
            .json({ error: "Too many URLs. Maximum 50 allowed." });
    }

    // If this is a batch request, process only a small chunk
    if (batch) {
        const BATCH_SIZE = 5;
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, urls.length);
        const batchUrls = urls.slice(startIndex, endIndex);

        const results = await Promise.allSettled(
            batchUrls.map((url) => processSingleUrl(url))
        );

        const processedResults = results.map((result) =>
            result.status === "fulfilled"
                ? result.value
                : {
                      url: "unknown",
                      title: "Processing failed",
                      description: "An unexpected error occurred",
                      image: null,
                      success: false,
                      error: "PROCESSING_FAILED",
                  }
        );

        return res.status(200).json({
            results: processedResults,
            batchIndex,
            isComplete: endIndex >= urls.length,
            totalProcessed: endIndex,
            totalUrls: urls.length,
        });
    }

    // Original behavior - process all at once
    const results = await Promise.allSettled(
        urls.map((url) => processSingleUrl(url))
    );

    const processedResults = results.map((result) =>
        result.status === "fulfilled"
            ? result.value
            : {
                  url: "unknown",
                  title: "Processing failed",
                  description: "An unexpected error occurred",
                  image: null,
                  success: false,
                  error: "PROCESSING_FAILED",
              }
    );

    const summary = {
        total: processedResults.length,
        successful: processedResults.filter((r) => r.success).length,
        failed: processedResults.filter((r) => !r.success).length,
        withImages: processedResults.filter((r) => r.image).length,
    };

    res.status(200).json({
        results: processedResults,
        summary,
    });
}
