"use client";

import {
  Braces,
  Coins,
  Database,
  Package,
  Sigma,
  Timer,
  Users,
} from "lucide-react";
import { memo } from "react";
import type { SectionId } from "@/lib/store-builder/problem";
import type { Project } from "@/lib/store-builder/project";
import type { Update } from "../use-project";
import { BalanceSettings } from "./balances";
import { DataSettings } from "./data";
import { PlayerSettings } from "./players";
import { QuantitySettings } from "./quantities";
import { Section } from "./section";
import { StoreSettings } from "./store";
import { TimingSettings } from "./timing";
import { TotalSettings } from "./totals";

function SidebarView({
  project,
  update,
  opKinds,
  open,
  onOpen,
  sectionsWithProblems,
}: {
  project: Project;
  update: Update;
  opKinds: string[];
  open: Set<SectionId>;
  onOpen: (id: SectionId, open: boolean) => void;
  sectionsWithProblems: Set<SectionId>;
}) {
  const section = (id: SectionId) => ({
    id,
    open: open.has(id),
    onOpen,
    hasProblem: sectionsWithProblems.has(id),
  });

  return (
    <div className="flex flex-col gap-0.5">
      <Section {...section("store")} title="Store" icon={Database}>
        <StoreSettings project={project} update={update} />
      </Section>
      <Section
        {...section("data")}
        title="Data"
        icon={Braces}
        count={project.fields.length}
      >
        <DataSettings project={project} update={update} />
      </Section>
      <Section
        {...section("balances")}
        title="Balances"
        icon={Coins}
        count={project.balances.length}
      >
        <BalanceSettings project={project} update={update} />
      </Section>
      <Section
        {...section("totals")}
        title="Totals"
        icon={Sigma}
        count={project.totals.length}
      >
        <TotalSettings project={project} update={update} />
      </Section>
      <Section
        {...section("quantities")}
        title="Quantities"
        icon={Package}
        count={project.quantities.length}
      >
        <QuantitySettings project={project} update={update} />
      </Section>
      {project.store.keys === "Player" ? (
        <Section {...section("players")} title="Players" icon={Users}>
          <PlayerSettings project={project} update={update} />
        </Section>
      ) : null}
      <Section {...section("timing")} title="Timing & testing" icon={Timer}>
        <TimingSettings project={project} update={update} opKinds={opKinds} />
      </Section>
    </div>
  );
}

export const Sidebar = memo(SidebarView);
