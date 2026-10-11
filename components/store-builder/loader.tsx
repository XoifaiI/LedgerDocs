"use client";

// Loads the builder in the browser only: Blockly needs the DOM, and there's nothing to prerender
// but the frame, which shows while it loads.

import dynamic from "next/dynamic";

function Skeleton() {
  return (
    <div
      aria-busy="true"
      className="flex h-[calc(100dvh-3.5rem)] min-h-[32rem] w-full gap-4 p-2 sm:p-4"
    >
      <span className="sr-only">Loading the store builder</span>
      <div className="hidden w-[22rem] shrink-0 animate-pulse rounded-xl border bg-fd-card md:block" />
      <div className="flex-1 animate-pulse rounded-xl border bg-fd-secondary" />
    </div>
  );
}

const StoreBuilder = dynamic(
  () => import("./store-builder").then((module) => module.StoreBuilder),
  { ssr: false, loading: Skeleton },
);

export function StoreBuilderLoader() {
  return <StoreBuilder />;
}
