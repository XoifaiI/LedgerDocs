"use client";

import { settingId } from "@/lib/store-builder/problem";
import {
  type Balance,
  type BalanceKind,
  makeUid,
  type Project,
} from "@/lib/store-builder/project";
import {
  AddButton,
  Card,
  Intro,
  Labelled,
  NumberInput,
  Problem,
  RemoveButton,
  Select,
  TextInput,
} from "../controls";
import type { Update } from "../use-project";

type Direction = "credit" | "debit";

function KindRows({
  balance,
  direction,
  update,
}: {
  balance: Balance;
  direction: Direction;
  update: Update;
}) {
  const kinds = balance[direction];
  const custom = balance.arithmetic !== "";
  const change = (edit: (kinds: BalanceKind[]) => void) =>
    update((draft) => {
      const found = draft.balances.find(
        (candidate) => candidate.uid === balance.uid,
      );
      if (found) {
        edit(found[direction]);
      }
    });
  const title = direction === "credit" ? "Credit" : "Debit";

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-fd-muted-foreground">
        {title}
        <span className="font-normal">
          {direction === "credit"
            ? " · ops that add Amount"
            : " · ops that take Amount away"}
        </span>
      </p>
      {kinds.map((kind, index) => (
        <div key={kind.uid} className="flex flex-col gap-1">
          <div className="grid grid-cols-[minmax(0,1fr)_4.25rem_4.25rem_auto] items-center gap-1.5">
            <TextInput
              id={settingId.kind(kind.uid)}
              aria-label={`${title} kind`}
              mono
              value={kind.kind}
              onValue={(value) =>
                change((draft) => {
                  draft[index].kind = value;
                })
              }
            />
            <TextInput
              id={settingId.kind(`${kind.uid}-min`)}
              aria-label={`${kind.kind} Min`}
              title="This kind's own Min"
              mono
              placeholder="Min"
              inputMode={custom ? undefined : "numeric"}
              value={kind.min}
              onValue={(value) =>
                change((draft) => {
                  draft[index].min = value;
                })
              }
            />
            <TextInput
              id={settingId.kind(`${kind.uid}-max`)}
              aria-label={`${kind.kind} Max`}
              title="This kind's own Max"
              mono
              placeholder="Max"
              inputMode={custom ? undefined : "numeric"}
              value={kind.max}
              onValue={(value) =>
                change((draft) => {
                  draft[index].max = value;
                })
              }
            />
            <RemoveButton
              label={`Remove ${kind.kind || "kind"}`}
              onClick={() =>
                change((draft) => {
                  draft.splice(index, 1);
                })
              }
            />
          </div>
          <Problem id={settingId.kind(kind.uid)} />
          <Problem id={settingId.kind(`${kind.uid}-min`)} />
          <Problem id={settingId.kind(`${kind.uid}-max`)} />
        </div>
      ))}
      <AddButton
        onClick={() =>
          change((draft) => {
            draft.push({ uid: makeUid(), kind: "", min: "", max: "" });
          })
        }
      >
        {title} kind
      </AddButton>
    </div>
  );
}

export function BalanceSettings({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const candidates = project.fields.filter(
    (field) => field.type === "number" || field.type === "luau",
  );
  const change = (uid: string, edit: (balance: Balance) => void) =>
    update((draft) => {
      const found = draft.balances.find((candidate) => candidate.uid === uid);
      if (found) {
        edit(found);
      }
    });
  const unused = candidates.find(
    (field) => !project.balances.some((balance) => balance.field === field.uid),
  );

  return (
    <>
      <Intro>
        Number fields Ledger changes for you. Its ops carry an Amount, never
        reach your reducer, and can't take the field past its Min or Max.
      </Intro>
      {project.balances.map((balance) => {
        const id = (part: string) => settingId.balance(balance.uid, part);
        const options = [
          ["", "Pick a field"] as const,
          ...candidates.map(
            (field) => [field.uid, field.name || "(unnamed)"] as const,
          ),
        ];
        return (
          <Card key={balance.uid}>
            <div className="flex items-center gap-2">
              <Select
                id={id("field")}
                label="Balance field"
                className="font-mono"
                value={balance.field}
                options={options}
                onValue={(value) =>
                  change(balance.uid, (draft) => {
                    draft.field = value;
                  })
                }
              />
              <RemoveButton
                label="Remove this balance"
                onClick={() =>
                  update((draft) => {
                    draft.balances = draft.balances.filter(
                      (candidate) => candidate.uid !== balance.uid,
                    );
                  })
                }
              />
            </div>
            <Problem id={id("field")} />
            <KindRows balance={balance} direction="credit" update={update} />
            <Problem id={id("credit")} />
            <KindRows balance={balance} direction="debit" update={update} />
            <div className="grid grid-cols-2 gap-2">
              <Labelled label="Min" htmlFor={id("min")}>
                <NumberInput
                  id={id("min")}
                  placeholder="0"
                  value={balance.min}
                  onValue={(value) =>
                    change(balance.uid, (draft) => {
                      draft.min = value;
                    })
                  }
                />
              </Labelled>
              <Labelled label="Max" htmlFor={id("max")}>
                <NumberInput
                  id={id("max")}
                  placeholder="no limit"
                  value={balance.max}
                  onValue={(value) =>
                    change(balance.uid, (draft) => {
                      draft.max = value;
                    })
                  }
                />
              </Labelled>
            </div>
            <Labelled
              label="Arithmetic"
              htmlFor={id("arithmetic")}
              help="For amounts that aren't plain whole numbers, like very big numbers. Use a Luau type field, and Min and Max become Luau expressions."
            >
              <TextInput
                id={id("arithmetic")}
                mono
                placeholder="whole numbers"
                value={balance.arithmetic}
                onValue={(value) =>
                  change(balance.uid, (draft) => {
                    draft.arithmetic = value;
                  })
                }
              />
            </Labelled>
          </Card>
        );
      })}
      {candidates.length === 0 ? (
        <Intro>Add a number field in Data first.</Intro>
      ) : (
        <AddButton
          onClick={() =>
            update((draft) => {
              draft.balances.push({
                uid: makeUid(),
                field: unused?.uid ?? "",
                credit: [],
                debit: [],
                min: "",
                max: "",
                arithmetic: "",
              });
            })
          }
        >
          Add balance
        </AddButton>
      )}
    </>
  );
}
