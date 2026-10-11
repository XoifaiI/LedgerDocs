"use client";

import {
  CEILING,
  LEG_LEAST,
  TIMED_WINDOW_DEFAULT,
  TIMED_WINDOW_LEAST,
  TIMINGS,
  UNTIMED_WINDOW_LEAST,
} from "@/lib/store-builder/limits";
import { settingId } from "@/lib/store-builder/problem";
import {
  balanceKinds,
  makeUid,
  type Project,
  type Timing,
} from "@/lib/store-builder/project";
import {
  AddButton,
  Intro,
  Labelled,
  NumberInput,
  Problem,
  RemoveButton,
  Select,
  Switch,
  TextInput,
} from "../controls";
import type { Update } from "../use-project";

const DAYS = CEILING / 86_400;

const TIMING_FIELDS: {
  key: Exclude<keyof Timing, "windows" | "legLimit">;
  part: string;
  label: string;
  setting: keyof typeof TIMINGS;
  help: string;
}[] = [
  {
    key: "saveInterval",
    part: "save-interval",
    label: "SaveInterval",
    setting: "SaveInterval",
    help: "Seconds between a session's saves when it has changes.",
  },
  {
    key: "idleReadInterval",
    part: "idle-read-interval",
    label: "IdleReadInterval",
    setting: "IdleReadInterval",
    help: "Seconds between reads when nothing's waiting: how soon a player sees changes from other servers.",
  },
  {
    key: "holdMax",
    part: "hold-max",
    label: "HoldMax",
    setting: "HoldMax",
    help: "The longest a quantity Hold can last.",
  },
  {
    key: "orphanAge",
    part: "orphan-age",
    label: "OrphanAge",
    setting: "OrphanAge",
    help: "Seconds before a trade whose deciding key never appeared hands its amounts back.",
  },
  {
    key: "cutWindow",
    part: "cut-window",
    label: "CutWindow",
    setting: "CutWindow",
    help: "Seconds a key remembers a Reset or Erase name, so a repeat is safe.",
  },
];

export function TimingSettings({
  project,
  update,
  opKinds,
}: {
  project: Project;
  update: Update;
  opKinds: string[];
}) {
  const kinds = [
    ...new Set([
      ...opKinds,
      ...balanceKinds(project).map((entry) => entry.kind.kind),
    ]),
  ].filter(Boolean);
  const { mock } = project;

  return (
    <>
      <Intro>
        Ledger's defaults are right for almost every game. Leave these empty
        unless you know you need one.
      </Intro>
      <div className="grid grid-cols-2 gap-2">
        {TIMING_FIELDS.map(({ key, part, label, setting, help }) => (
          <Labelled
            key={key}
            label={label}
            htmlFor={settingId.timing(part)}
            help={help}
          >
            <NumberInput
              id={settingId.timing(part)}
              placeholder={TIMINGS[setting].fallback.toLocaleString("en")}
              value={project.timing[key]}
              onValue={(value) =>
                update((draft) => {
                  draft.timing[key] = value;
                })
              }
            />
          </Labelled>
        ))}
        <Labelled
          label="LegLimit"
          htmlFor={settingId.timing("leg-limit")}
          help={`The most parts a Tx touching this store may have. At least ${LEG_LEAST}.`}
        >
          <NumberInput
            id={settingId.timing("leg-limit")}
            placeholder="no limit"
            value={project.timing.legLimit}
            onValue={(value) =>
              update((draft) => {
                draft.timing.legLimit = value;
              })
            }
          />
        </Labelled>
      </div>

      <div className="flex flex-col gap-1.5 pt-2">
        <p className="text-sm font-medium">Windows</p>
        <Intro>
          How long a key remembers a named op of one kind. Timed is for names
          with an IdAt ({TIMED_WINDOW_LEAST} s to {DAYS} days,{" "}
          {TIMED_WINDOW_DEFAULT} s by default). Set Untimed for a kind you name
          without IdAt ({UNTIMED_WINDOW_LEAST} s up).
        </Intro>
        {project.timing.windows.map((window, index) => {
          const id = (part: string) => settingId.window(window.uid, part);
          const options = [
            ["", "Pick a kind"] as const,
            ...[...new Set([...kinds, window.kind])]
              .filter(Boolean)
              .map((kind) => [kind, kind] as const),
          ];
          return (
            <div key={window.uid} className="flex flex-col gap-1">
              <div className="grid grid-cols-[minmax(0,1fr)_4.25rem_4.25rem_auto] items-center gap-1.5">
                <Select
                  id={id("kind")}
                  label="Op kind"
                  className="font-mono"
                  value={window.kind}
                  options={options}
                  onValue={(value) =>
                    update((draft) => {
                      draft.timing.windows[index].kind = value;
                    })
                  }
                />
                <NumberInput
                  id={id("timed")}
                  aria-label="Timed"
                  placeholder="Timed"
                  value={window.timed}
                  onValue={(value) =>
                    update((draft) => {
                      draft.timing.windows[index].timed = value;
                    })
                  }
                />
                <NumberInput
                  id={id("untimed")}
                  aria-label="Untimed"
                  placeholder="Untimed"
                  value={window.untimed}
                  onValue={(value) =>
                    update((draft) => {
                      draft.timing.windows[index].untimed = value;
                    })
                  }
                />
                <RemoveButton
                  label="Remove this window"
                  onClick={() =>
                    update((draft) => {
                      draft.timing.windows.splice(index, 1);
                    })
                  }
                />
              </div>
              <Problem id={id("kind")} />
              <Problem id={id("timed")} />
              <Problem id={id("untimed")} />
            </div>
          );
        })}
        <AddButton
          onClick={() =>
            update((draft) => {
              draft.timing.windows.push({
                uid: makeUid(),
                kind: "",
                timed: "",
                untimed: "",
              });
            })
          }
        >
          Add window
        </AddButton>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <p className="text-sm font-medium">Testing</p>
        <Switch
          id={settingId.mock("enabled")}
          label="Run on the Mock package"
          checked={mock.enabled}
          onChecked={(value) =>
            update((draft) => {
              draft.mock.enabled = value;
            })
          }
          help="Keeps everything in memory with the real limits, so tests never touch players' data."
        />
        {mock.enabled ? (
          <>
            <Switch
              id={settingId.mock("studio-only")}
              label="Only in Studio"
              checked={mock.studioOnly}
              onChecked={(value) =>
                update((draft) => {
                  draft.mock.studioOnly = value;
                })
              }
              help="Live servers keep the real DataStores."
            />
            <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
              <Labelled label="Mock lives at" htmlFor={settingId.mock("path")}>
                <TextInput
                  id={settingId.mock("path")}
                  mono
                  value={mock.path}
                  onValue={(value) =>
                    update((draft) => {
                      draft.mock.path = value;
                    })
                  }
                />
              </Labelled>
              <Labelled label="Players" htmlFor={settingId.mock("players")}>
                <NumberInput
                  id={settingId.mock("players")}
                  placeholder="10"
                  value={mock.players}
                  onValue={(value) =>
                    update((draft) => {
                      draft.mock.players = value;
                    })
                  }
                />
              </Labelled>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
