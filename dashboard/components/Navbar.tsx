import Link from "next/link";
import styles from "./Navbar.module.css";
import { Anchor } from "lucide-react";

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Anchor size={24} color="#e2e8f0" />
        <span className={styles.brandName}>LATTICE</span>
      </div>
      <div className={styles.navLinks}>
        <Link href="/" className={styles.link}>Lattice Home</Link>
        <Link href="/dashboard" className={styles.link}>Command Center</Link>
        <Link href="/console" className={styles.link}>Captain's Log</Link>
      </div>
      <div className={styles.actions}>
        <Link href="/dashboard" className={styles.ctaButton}>
          Launch Session
        </Link>
      </div>
    </nav>
  );
}
