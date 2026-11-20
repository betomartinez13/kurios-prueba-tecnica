import { Button } from "@/components/Button/Button";

import styles from "./ErrorState.module.scss";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.state} role="alert">
      <p className={styles.message}>{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
