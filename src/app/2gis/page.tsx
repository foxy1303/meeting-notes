import { TwoGisMap } from "../components/TwoGisMap";
import styles from "./page.module.css";

export default function TwoGisPage() {
  return (
    <main className={styles.page}>
      <TwoGisMap fullscreen />
    </main>
  );
}
