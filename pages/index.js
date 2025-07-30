import { useState, useRef, useEffect } from "react";
import axios from "axios";
import styles from "../styles/LinkPeek.module.css";

export default function LinkPeek() {
    const [urls, setUrls] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height =
                textareaRef.current.scrollHeight + "px";
        }
    }, [urls]);

    const fetchMetadata = async () => {
        setLoading(true);
        setToast(null);
        const urlList = urls
            .split(/\n|,/)
            .map((u) => u.trim())
            .filter(Boolean);
        try {
            const res = await axios.post("/api/fetch-metadata", {
                urls: urlList,
            });
            setResults(res.data);
            setToast({
                type: "success",
                message: "Metadata fetched successfully!",
            });
        } catch {
            setToast({ type: "error", message: "Failed to fetch metadata." });
        } finally {
            setLoading(false);
        }
    };

    const clearAll = () => {
        setUrls("");
        setResults([]);
        setToast(null);
    };

    return (
        <main className={styles.container}>
            <section className={styles.card}>
                <h1 className={styles.title}>LinkPeek</h1>

                <textarea
                    ref={textareaRef}
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    placeholder="Paste URLs separated by newlines or commas..."
                    spellCheck={false}
                    rows={3}
                    className={styles.textarea}
                />

                <div className={styles.buttonGroup}>
                    <button
                        disabled={loading || !urls.trim()}
                        onClick={fetchMetadata}
                        className={`${styles.button} ${
                            loading || !urls.trim()
                                ? styles.buttonDisabled
                                : styles.buttonPrimary
                        }`}
                    >
                        {loading ? (
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "20px",
                                    height: "20px",
                                    border: "3px solid white",
                                    borderTopColor: "transparent",
                                    borderRadius: "50%",
                                    animation: "spin 1s linear infinite",
                                    marginRight: "0.5rem",
                                }}
                            />
                        ) : null}
                        {loading ? "Fetching..." : "Generate Preview"}
                    </button>

                    <button
                        disabled={loading}
                        onClick={clearAll}
                        className={`${styles.button} ${styles.buttonSecondary}`}
                    >
                        Clear All
                    </button>
                </div>

                {toast && (
                    <div
                        className={`${styles.toast} ${
                            toast.type === "success"
                                ? styles.toastSuccess
                                : styles.toastError
                        }`}
                    >
                        {toast.message}
                    </div>
                )}

                {results.length > 0 && (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th
                                        style={{ minWidth: "320px" }}
                                        className={styles.th}
                                    >
                                        URL
                                    </th>
                                    <th className={styles.th}>Title</th>
                                    <th className={styles.th}>Description</th>
                                    <th
                                        className={`${styles.th} ${styles.thStatus}`}
                                    >
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map(
                                    (
                                        { url, title, description, status },
                                        i
                                    ) => (
                                        <tr
                                            key={i}
                                            className={
                                                i % 2 === 0
                                                    ? styles.trEven
                                                    : styles.trOdd
                                            }
                                            title={description || ""}
                                        >
                                            <td className={styles.td}>
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.urlLink}
                                                >
                                                    {url}
                                                </a>
                                            </td>
                                            <td
                                                className={styles.td}
                                                style={{ fontWeight: "600" }}
                                            >
                                                {title || "—"}
                                            </td>
                                            <td
                                                className={`${styles.td} ${styles.description}`}
                                            >
                                                {description || "—"}
                                            </td>
                                            <td
                                                className={`${styles.td} ${styles.tdStatus}`}
                                            >
                                                {status === 200
                                                    ? "✅"
                                                    : status === "Error"
                                                    ? "❌"
                                                    : status}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <style jsx global>{`
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </main>
    );
}
