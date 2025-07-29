import { useState } from "react";
import axios from "axios";

export default function LinkPeek() {
    const [urls, setUrls] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchMetadata = async () => {
        setLoading(true);
        const urlList = urls
            .split(/\n|,/)
            .map((u) => u.trim())
            .filter(Boolean);
        try {
            const res = await axios.post("/api/fetch-metadata", {
                urls: urlList,
            });
            setResults(res.data);
        } catch (err) {
            alert("Error fetching metadata");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">🔗 LinkPeek</h1>
            <textarea
                className="w-full h-40 p-2 border rounded mb-4 text-sm"
                placeholder="Paste URLs separated by newline or comma"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
            />
            <button
                onClick={fetchMetadata}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? "Fetching..." : "Generate Preview"}
            </button>

            {results.length > 0 && (
                <table className="mt-6 w-full text-sm border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border p-2">URL</th>
                            <th className="border p-2">Title</th>
                            <th className="border p-2">Description</th>
                            <th className="border p-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((res, i) => (
                            <tr key={i} className="border">
                                <td className="border p-2 break-all">
                                    {res.url}
                                </td>
                                <td className="border p-2">{res.title}</td>
                                <td className="border p-2">
                                    {res.description}
                                </td>
                                <td className="border p-2">{res.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
