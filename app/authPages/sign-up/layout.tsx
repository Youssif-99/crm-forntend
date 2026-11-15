import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create account | BusinessOS",
  description: "Create a single-user BusinessOS workspace.",
};

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
