"use client";

import { SHARDS_DEFAULT } from "@/lib/store-builder/limits";
import { settingId } from "@/lib/store-builder/problem";
import { makeUid, type Project } from "@/lib/store-builder/project";
import {
  AddButton,
  Intro,
  NumberInput,
  Problem,
  RemoveButton,
  TextInput,
} from "../controls";
import type { Update } from "../use-project";

export function TotalSettings({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  return (
    <>
      <Intro>
        Counters for stats you show, like GoldSpent. Your scripts Bump them, and
        every server can read them. Add them any time, but never rename one.
      </Intro>
      {project.totals.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] gap-x-1.5 gap-y-1 text-xs font-medium text-fd-muted-foreground">
          <span>Name</span>
          <span>Shards</span>
          <span className="w-6" />
        </div>
      ) : null}
      {project.totals.map((total, index) => {
        const id = (part: string) => settingId.total(total.uid, part);
        return (
          <div key={total.uid} className="flex flex-col gap-1">
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-center gap-1.5">
              <TextInput
                id={id("name")}
                aria-label="Total name"
                mono
                value={total.name}
                onValue={(value) =>
                  update((draft) => {
                    draft.totals[index].name = value;
                  })
                }
              />
              <NumberInput
                id={id("shards")}
                aria-label="Shards"
                placeholder={String(SHARDS_DEFAULT)}
                value={total.shards}
                onValue={(value) =>
                  update((draft) => {
                    draft.totals[index].shards = value;
                  })
                }
              />
              <RemoveButton
                label={`Remove ${total.name || "total"}`}
                onClick={() =>
                  update((draft) => {
                    draft.totals.splice(index, 1);
                  })
                }
              />
            </div>
            <Problem id={id("name")} />
            <Problem id={id("shards")} />
          </div>
        );
      })}
      <AddButton
        onClick={() =>
          update((draft) => {
            draft.totals.push({ uid: makeUid(), name: "", shards: "" });
          })
        }
      >
        Add total
      </AddButton>
    </>
  );
}
