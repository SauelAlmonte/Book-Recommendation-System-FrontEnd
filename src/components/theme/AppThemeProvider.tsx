"use client";

import type { ReactNode, ReactElement } from "react";
import { ThemeProvider } from "next-themes";

type AppThemeProviderProps = {
  children: ReactNode;
};

export function AppThemeProvider({
  children,
}: AppThemeProviderProps): ReactElement {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      {children}
    </ThemeProvider>
  );
}
