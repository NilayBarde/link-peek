import { useSession, signIn, signOut } from "next-auth/react";

export default function StatusBar() {
    const { data: session } = useSession();

    return (
        <div style={{ textAlign: "right", marginBottom: "1rem" }}>
            {session ? (
                <>
                    Logged in as <strong>{session.user.email}</strong> |{" "}
                    <span
                        style={{ color: session.user.isPro ? "green" : "red" }}
                    >
                        {session.user.isPro ? "Pro ✅" : "Free 🚫"}
                    </span>{" "}
                    |{" "}
                    <button
                        onClick={() => signOut()}
                        style={{ marginLeft: "0.5rem" }}
                    >
                        Sign out
                    </button>
                </>
            ) : (
                <>
                    Not logged in |{" "}
                    <button onClick={() => signIn()}>Sign in</button>
                </>
            )}
        </div>
    );
}
