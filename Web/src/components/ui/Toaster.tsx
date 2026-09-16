"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      duration={4500}
      toastOptions={{
        className: "font-sans",
        style: {
          borderRadius: "12px",
        },
      }}
    />
  );
}
