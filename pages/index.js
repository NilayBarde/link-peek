import { useEffect, useState } from "react";
import axios from "axios";
import { unparse } from "papaparse";
import StatusBar from "../components/src/StatusBar";
import { useSession, signIn } from "next-auth/react";
import styles from "../styles/LinkPeek.module.css";

const MAX_FREE_PREVIEWS = 10;

export default function LinkPeek() {
    const [urls, setUrls] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewCount, setPreviewCount] = useState(0);
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

    // Determine if the user is limited or not:
    // If pro, never limit; else limit by previewCount
    const isLimitReached =
        !session?.user?.isPro && previewCount >= MAX_FREE_PREVIEWS;

    const handleSubmit = async () => {
        if (session?.user?.isPro) {
            // Pro user: no limit on previews
            // Just send all URLs entered
            const urlList = urls
                .split(/\n|,/)
                .map((url) => url.trim())
                .filter(Boolean);

            if (!urlList.length) return;

            setLoading(true);
            try {
                const res = await axios.post("/api/fetch-metadata", {
                    urls: urlList,
                });

                setResults((prev) => [...prev, ...res.data]);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        } else {
            // Free user: enforce daily limit logic
            const urlList = urls
                .split(/\n|,/)
                .map((url) => url.trim())
                .filter(Boolean);

            if (!urlList.length) return;

            const availableSlots = MAX_FREE_PREVIEWS - previewCount;

            if (availableSlots <= 0) {
                alert("You've reached your daily preview limit.");
                return;
            }

            const safeUrlList = urlList.slice(0, availableSlots);

            setLoading(true);
            try {
                const res = await axios.post("/api/fetch-metadata", {
                    urls: safeUrlList,
                });

                if (urlList.length > availableSlots) {
                    alert(
                        `You can only preview ${availableSlots} more URL${
                            availableSlots > 1 ? "s" : ""
                        } today.`
                    );
                }

                setResults((prev) => [...prev, ...res.data]);

                const newCount = previewCount + safeUrlList.length;
                localStorage.setItem(
                    "linkPeekPreviewCount",
                    newCount.toString()
                );
                setPreviewCount(newCount);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
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
                    from multiple URLs at once.
                </p>

                <textarea
                    className={styles.textarea}
                    placeholder="Paste URLs (newline or comma-separated)"
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

                {isLimitReached && (
                    <div className={styles.limitNotice}>
                        <p>
                            <strong>Limit Reached:</strong> You've used all your
                            free previews for today.
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
                                    />
                                ) : (
                                    <div className={styles.placeholder}>
                                        No Image
                                    </div>
                                )}
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
