import type { Metadata } from "next";
import HomePage from "./(marketing)/HomePage";

export const metadata: Metadata = {
  title: "BusinessOS | Business workspace",
  description: "A single-user workspace for customer records, sales opportunities, invoices, expenses, tasks, and appointments.",
};

export default function Page() {
  return <HomePage />;
}
