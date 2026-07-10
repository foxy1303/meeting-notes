import styles from "./EmptyState.module.css";

export function EmptyState() {
  return (
    <section className={styles.empty}>
      <div>
        <h2>Что появится после обработки</h2>
        <p>
          Сводка, список решений, задачи с ответственными, открытые вопросы,
          риски и полный текст записи. Данные обрабатываются локальными
          моделями.
        </p>
      </div>
      <div className={styles.steps}>
        <span>1. Загрузка</span>
        <span>2. Транскрипция</span>
        <span>3. Сводка</span>
      </div>
    </section>
  );
}
