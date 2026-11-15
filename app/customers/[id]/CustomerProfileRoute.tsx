"use client";

import { useParams } from "next/navigation";
import CustomerProfile from "./CustomerProfile";

export default function CustomerProfileRoute() {
  const { id } = useParams<{ id: string }>();
  return <CustomerProfile id={id} />;
}
