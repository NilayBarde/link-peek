import { useState } from "react";
import axios from "axios";
import styles from "../styles/LinkPeek.module.css";

export default function LinkPeek() {
    const [urls, setUrls] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
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
            setResults(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageWrapper}>
                <h1 className={styles.title}>Link Peek</h1>

                <textarea
                    className={styles.textarea}
                    placeholder="Paste URLs (newline or comma-separated)"
                    rows={6}
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                />

                <div className={styles.buttonGroup}>
                    <button
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        disabled={loading}
                        onClick={handleSubmit}
                    >
                        {loading ? "Loading..." : "Generate Preview"}
                    </button>
                </div>

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
