import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";

const WipeApp = () => {
    const { auth, isLoading, error, clearError, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [files, setFiles] = useState<FSItem[]>([]);

    const loadFiles = async () => {
        const files = (await fs.readDir("./")) as FSItem[];
        setFiles(files);
    };

    useEffect(() => {
        loadFiles();
    }, []);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate("/auth?next=/wipe");
        }
    }, [isLoading]);

    const handleDelete = async () => {
        files.forEach(async (file) => {
            await fs.delete(file.path);
        });
        await kv.flush();
        loadFiles();
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error {error}</div>;
    }

    return (
        <main className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto flex flex-col gap-4">
            <p className="font-semibold text-gray-800 text-sm sm:text-base">Authenticated as: {auth.user?.username || "Guest"}</p>
            <div className="text-gray-600 font-medium text-sm sm:text-base">Existing files:</div>
            <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                {files.length === 0 ? (
                    <p className="text-gray-400 text-sm">No files stored.</p>
                ) : (
                    files.map((file) => (
                        <div key={file.id || file.name} className="flex flex-row gap-4 text-xs sm:text-sm text-gray-700 truncate">
                            <p>{file.name}</p>
                        </div>
                    ))
                )}
            </div>
            <div>
                <button
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg cursor-pointer transition text-xs sm:text-sm font-semibold shadow-sm"
                    onClick={() => handleDelete()}
                >
                    Wipe App Data
                </button>
            </div>
        </main>
    );
};

export default WipeApp;