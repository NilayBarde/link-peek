import Link from "next/link";
import styles from "../styles/LinkPeek.module.css";

export default function Success() {
    return (
        <div className={styles.container}>
            <div className={styles.pageWrapper}>
                <h1 className={styles.title}>🎉 Payment Successful!</h1>
                <p className={styles.successMessage}>
                    Thank you for upgrading to <strong>Link Peek Pro</strong>!
                </p>

                <p className={styles.successMessage}>
                    You now have unlimited access to preview URLs and export
                    data without limits.
                </p>

                <div className={styles.buttonGroup}>
                    <Link
                        href="/"
                        className={`${styles.button} ${styles.buttonPrimary}`}
                    >
                        Go back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
