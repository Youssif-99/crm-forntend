import { Suspense } from "react";
import CustomerProfileRoute from "./CustomerProfileRoute";

export default function CustomerProfilePage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f7f8fa]"><p className="text-sm text-[#738097]">Loading customer profile...</p></main>}><CustomerProfileRoute /></Suspense>;
}
