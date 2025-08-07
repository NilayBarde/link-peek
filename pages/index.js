import { useEffect, useState } from "react";
import { unparse } from "papaparse";
import StatusBar from "../components/src/StatusBar";
import { useSession, signIn } from "next-auth/react";
import styles from "../styles/LinkPeek.module.css";

const MAX_FREE_PREVIEWS = 10;

// Function to normalize URLs
const normalizeUrl = (url) => {
    // Remove whitespace
    url = url.trim();

    // Skip if empty
    if (!url) return null;

    // If it already has a protocol, return as is
    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    // If it starts with www., add https://
    if (/^www\./i.test(url)) {
        return `https://${url}`;
    }

    // If it looks like a domain (contains a dot), add https://www.
    if (/\.[a-z]{2,}$/i.test(url)) {
        return `https://www.${url}`;
    }

    // If it's just a domain name without extension, add .com and https://www.
    if (/^[a-zA-Z0-9-]+$/.test(url)) {
        return `https://www.${url}.com`;
    }

    // Default: add https://www.
    return `https://www.${url}`;
};

export default function LinkPeek() {
    const [urls, setUrls] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewCount, setPreviewCount] = useState(0);
    const [progress, setProgress] = useState({
        completed: 0,
        total: 0,
        message: "",
    });
    const { data: session } = useSession();

    // Reset daily usage limit
    useEffect(() => {
        const lastReset = localStorage.getItem("linkPeekReset");
        const now = Date.now();

        if (!lastReset || now - Number(lastReset) > 86400000) {
            localStorage.setItem("linkPeekPreviewCount", "0");
            localStorage.setItem("linkPeekReset", now.toString());
            setPreviewCount(0);
        } else {
            const count =
                Number(localStorage.getItem("linkPeekPreviewCount")) || 0;
            setPreviewCount(count);
        }
    }, []);

    // Function to handle batch processing with progress
    const fetchWithProgress = async (urlList) => {
        setResults([]);
        setProgress({
            completed: 0,
            total: urlList.length,
            message: "Starting...",
        });

        try {
            const BATCH_SIZE = 5;
            const totalBatches = Math.ceil(urlList.length / BATCH_SIZE);
            let allResults = [];

            for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
                setProgress({
                    completed: batchIndex * BATCH_SIZE,
                    total: urlList.length,
                    message: `Processing batch ${
                        batchIndex + 1
                    } of ${totalBatches}...`,
                });

                const response = await fetch("/api/fetch-metadata", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        urls: urlList,
                        batch: true,
                        batchIndex,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                allResults = [...allResults, ...data.results];

                // Update results in real-time
                setResults(allResults);
                setProgress({
                    completed: data.totalProcessed,
                    total: data.totalUrls,
                    message: `Completed ${data.totalProcessed}/${data.totalUrls} URLs`,
                });

                // Small delay between batches to show progress
                if (!data.isComplete) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }

            const successful = allResults.filter((r) => r.success).length;
            const failed = allResults.filter((r) => !r.success).length;

            setProgress({
                completed: urlList.length,
                total: urlList.length,
                message: `Completed! ${successful} successful, ${failed} failed`,
            });
        } catch (error) {
            console.error("Fetch error:", error);
            alert(
                "Error fetching previews. Please check your URLs and try again."
            );
            setProgress({ completed: 0, total: 0, message: "Error occurred" });
        }
    };

    // Determine if the user is limited or not:
    // If pro, never limit; else limit by previewCount
    const isLimitReached =
        !session?.user?.isPro && previewCount >= MAX_FREE_PREVIEWS;

    const handleSubmit = async () => {
        if (session?.user?.isPro) {
            // Pro user: no limit on previews
            const urlList = urls
                .split(/\n|,/)
                .map(normalizeUrl)
                .filter(Boolean);

            if (!urlList.length) return;

            setLoading(true);
            await fetchWithProgress(urlList);
            setLoading(false);
        } else {
            // Free user: enforce daily limit logic
            const urlList = urls
                .split(/\n|,/)
                .map(normalizeUrl)
                .filter(Boolean);

            if (!urlList.length) return;

            const availableSlots = MAX_FREE_PREVIEWS - previewCount;

            if (availableSlots <= 0) {
                alert("You've reached your daily preview limit.");
                return;
            }

            const safeUrlList = urlList.slice(0, availableSlots);

            if (urlList.length > availableSlots) {
                alert(
                    `You can only preview ${availableSlots} more URL${
                        availableSlots > 1 ? "s" : ""
                    } today.`
                );
            }

            setLoading(true);
            await fetchWithProgress(safeUrlList);

            const newCount = previewCount + safeUrlList.length;
            localStorage.setItem("linkPeekPreviewCount", newCount.toString());
            setPreviewCount(newCount);
            setLoading(false);
        }
    };

    const handleClearResults = () => {
        setResults([]);
        setUrls("");
        setProgress({ completed: 0, total: 0, message: "" });
    };

    const handleExportCSV = () => {
        if (!results.length) return;

        const csv = unparse(
            results.map(({ url, title, description, image }) => ({
                URL: url,
                Title: title,
                Description: description,
                Image: image,
            }))
        );

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "link-previews.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpgrade = async () => {
        try {
            const response = await fetch("/api/checkout-session", {
                method: "POST",
            });
            if (response.status === 401) {
                // Not logged in, redirect to sign in
                signIn();
                return;
            }
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Failed to start upgrade process.");
            }
        } catch (err) {
            console.error(err);
            alert("Error starting upgrade process.");
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageWrapper}>
                <StatusBar />
                <h1 className={styles.title}>Link Peek</h1>
                <p className={styles.descriptionText}>
                    Quickly preview website titles, descriptions, and images
                    from multiple URLs at once. Just enter domain names like
                    google.com or full URLs.
                </p>

                <textarea
                    className={styles.textarea}
                    placeholder="Enter URLs or domain names (e.g., google.com, https://example.com, www.site.com)"
                    rows={6}
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    disabled={isLimitReached}
                />

                <div className={styles.buttonGroup}>
                    <button
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        disabled={loading || isLimitReached}
                        onClick={handleSubmit}
                    >
                        {isLimitReached
                            ? "Daily Limit Reached"
                            : loading
                            ? "Loading..."
                            : "Generate Preview"}
                    </button>

                    <button
                        className={styles.buttonPurple}
                        onClick={handleClearResults}
                        disabled={loading}
                    >
                        Clear Results
                    </button>

                    <button
                        className={styles.buttonPurple}
                        onClick={handleExportCSV}
                        disabled={!results.length}
                    >
                        Export to CSV
                    </button>

                    {!session?.user?.isPro && (
                        <button
                            className={styles.buttonPurple}
                            onClick={handleUpgrade}
                        >
                            Upgrade to Pro
                        </button>
                    )}
                </div>

                {loading && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{
                                    width: `${
                                        progress.total > 0
                                            ? (progress.completed /
                                                  progress.total) *
                                              100
                                            : 0
                                    }%`,
                                }}
                            />
                        </div>
                        <p className={styles.progressText}>
                            {progress.message} ({progress.completed}/
                            {progress.total})
                        </p>
                    </div>
                )}

                {!session?.user?.isPro && (
                    <p className={styles.usageCounter}>
                        Daily usage: {previewCount}/{MAX_FREE_PREVIEWS}
                    </p>
                )}

                {isLimitReached && (
                    <div className={styles.limitNotice}>
                        <p>
                            <strong>Limit Reached:</strong> You&apos;ve used all
                            your free previews for today.
                        </p>
                        <button
                            onClick={handleUpgrade}
                            className={`${styles.button} ${styles.buttonPrimary}`}
                        >
                            Upgrade for Unlimited Access
                        </button>
                    </div>
                )}

                <div className={styles.cardGrid}>
                    {results.map((meta, idx) => (
                        <div key={idx} className={styles.card}>
                            <div className={styles.imageContainer}>
                                {meta.image ? (
                                    <img
                                        src={meta.image}
                                        alt={meta.title || "preview"}
                                        className={styles.image}
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display =
                                                "flex";
                                        }}
                                    />
                                ) : null}
                                <div
                                    className={styles.placeholder}
                                    style={{
                                        display: meta.image ? "none" : "flex",
                                    }}
                                >
                                    No Image
                                </div>
                            </div>
                            <div className={styles.meta}>
                                <p className={styles.metaTitle}>
                                    {meta.title || "No title found"}
                                </p>
                                <p className={styles.metaDescription}>
                                    {meta.description ||
                                        "No description available"}
                                </p>
                                <a
                                    href={meta.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.url}
                                >
                                    {meta.url}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
