import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in | BusinessOS",
  description: "Sign in to your BusinessOS workspace.",
};

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
