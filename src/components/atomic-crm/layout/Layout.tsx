import { Suspense, useEffect, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useLocaleState } from "ra-core";
import { Notification } from "@/components/admin/notification";
import { Error } from "@/components/admin/error";
import { Skeleton } from "@/components/ui/skeleton";

import { useConfigurationLoader } from "../root/useConfigurationLoader";
import Header from "./Header";

export const Layout = ({ children }: { children: ReactNode }) => {
  useConfigurationLoader();
  const [locale] = useLocaleState();
  useEffect(() => {
    document.documentElement.lang = locale === "pt-br" ? "pt-BR" : locale;
  }, [locale]);
  return (
    <>
      <Header />
      <main className="w-full pt-4 px-4" id="main-content">
        <ErrorBoundary FallbackComponent={Error}>
          <Suspense fallback={<Skeleton className="h-12 w-12 rounded-full" />}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
      <Notification />
    </>
  );
};
