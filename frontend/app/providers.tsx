"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/errors";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Un 400 o un 404 no cambian al repetir la petición: solo se reintenta red/servidor.
        retry: (failureCount, error) =>
          !(
            error instanceof ApiError &&
            (error.kind === "validation" || error.kind === "not_found")
          ) && failureCount < 1,
      },
      mutations: { retry: 0 },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // Un QueryClient por montaje: no se comparte entre peticiones del servidor.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </QueryClientProvider>
  );
}
