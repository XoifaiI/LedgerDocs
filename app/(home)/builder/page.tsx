import type { Metadata } from "next";
import { StoreBuilderLoader } from "@/components/store-builder/loader";

export const metadata: Metadata = {
  title: "Store builder",
  description:
    "Build a Ledger store from blocks and settings, and copy the typed Stores module it makes.",
};

export default function BuilderPage() {
  return <StoreBuilderLoader />;
}
