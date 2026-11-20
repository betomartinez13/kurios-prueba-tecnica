import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>
        <span translate="no">Kurios Education</span> · Registro de visitas
      </p>
    </footer>
  );
}
