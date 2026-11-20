"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/Button/Button";

import styles from "./NavBar.module.scss";

const NEW_VISIT_PATH = "/visitas/nueva";

type NavBarViewProps = {
  /** null mientras la ruta no se conoce (fallback de Suspense en el prerender). */
  pathname: string | null;
};

/** Barra flotante sin hooks: sirve también de fallback estático. */
export function NavBarView({ pathname }: NavBarViewProps) {
  const isVisitsActive = pathname === "/" || (pathname?.startsWith("/visitas/") ?? false);
  const showNewVisit = pathname !== NEW_VISIT_PATH;

  return (
    <header className={styles.wrapper}>
      <nav className={styles.pill} aria-label="Principal">
        <Link href="/" className={styles.brand}>
          <Image
            src="/kurios-k.png"
            alt="Kurios"
            width={22}
            height={30}
            className={styles.logo}
            priority
          />
          <span className={styles.brandText}>Registro de visitas</span>
        </Link>

        <Link
          href="/"
          className={styles.link}
          data-active={isVisitsActive || undefined}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          Visitas
        </Link>

        {showNewVisit && (
          <Button href={NEW_VISIT_PATH} className={styles.action}>
            <span className={styles.longLabel}>Registrar visita</span>
            <span className={styles.shortLabel}>Registrar</span>
          </Button>
        )}
      </nav>
    </header>
  );
}

export function NavBar() {
  const pathname = usePathname();
  return <NavBarView pathname={pathname} />;
}
