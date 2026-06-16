"use client";

import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";

import { theme } from "@/theme";

type AppProviderProps = {
  children: ReactNode;
};

export function AppProvider({ children }: AppProviderProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      {children}
    </MantineProvider>
  );
}
