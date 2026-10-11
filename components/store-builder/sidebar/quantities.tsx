"use client";

import { cn } from "@/lib/cn";
import { PROCEEDS_MAX } from "@/lib/store-builder/limits";
import { settingId } from "@/lib/store-builder/problem";
import {
  fieldByUid,
  makeUid,
  type Project,
  type Quantity,
} from "@/lib/store-builder/project";
import {
  AddButton,
  Card,
  Intro,
  Labelled,
  NumberInput,
  Problem,
  RemoveButton,
  Segmented,
  Switch,
  TextInput,
} from "../controls";
import type { Update } from "../use-project";

export function QuantitySettings({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const change = (uid: string, edit: (quantity: Quantity) => void) =>
    update((draft) => {
      const found = draft.quantities.find((candidate) => candidate.uid === uid);
      if (found) {
        edit(found);
      }
    });
  const balanceFields = project.balances
    .map((balance) => fieldByUid(project, balance.field))
    .filter((field) => field !== undefined);

  return (
    <>
      <Intro>
        Limited stock that many servers can sell at once. Never change a live
        one: declare a new name instead, like GoldenSword2.
      </Intro>
      {project.quantities.map((quantity) => {
        const id = (part: string) => settingId.quantity(quantity.uid, part);
        return (
          <Card key={quantity.uid}>
            <div className="flex items-center gap-2">
              <TextInput
                id={id("name")}
                aria-label="Quantity name"
                mono
                placeholder="GoldenSword"
                value={quantity.name}
                onValue={(value) =>
                  change(quantity.uid, (draft) => {
                    draft.name = value;
                  })
                }
              />
              <RemoveButton
                label={`Remove ${quantity.name || "quantity"}`}
                onClick={() =>
                  update((draft) => {
                    draft.quantities = draft.quantities.filter(
                      (candidate) => candidate.uid !== quantity.uid,
                    );
                  })
                }
              />
            </div>
            <Problem id={id("name")} />
            <Labelled
              label="Mode"
              htmlFor={id("mode")}
              help={
                quantity.mode === "Final"
                  ? "A fixed stock that never refills."
                  : "A pot you can add to with Deposit."
              }
            >
              <Segmented
                id={id("mode")}
                label="Mode"
                value={quantity.mode}
                options={[
                  ["Final", "Final"],
                  ["Open", "Open"],
                ]}
                onValue={(mode) =>
                  change(quantity.uid, (draft) => {
                    draft.mode = mode;
                  })
                }
              />
            </Labelled>
            <div className="grid grid-cols-2 gap-2">
              <Labelled label="Parts" htmlFor={id("parts")}>
                <NumberInput
                  id={id("parts")}
                  placeholder="2"
                  value={quantity.parts}
                  onValue={(value) =>
                    change(quantity.uid, (draft) => {
                      draft.parts = value;
                    })
                  }
                />
              </Labelled>
              {quantity.mode === "Final" ? (
                <Labelled label="Stock" htmlFor={id("stock")}>
                  <NumberInput
                    id={id("stock")}
                    placeholder="100"
                    value={quantity.stock}
                    onValue={(value) =>
                      change(quantity.uid, (draft) => {
                        draft.stock = value;
                      })
                    }
                  />
                </Labelled>
              ) : null}
            </div>
            {quantity.mode === "Final" ? (
              <>
                <Switch
                  id={id("serials")}
                  label="Serial numbers"
                  checked={quantity.serials}
                  onChecked={(value) =>
                    change(quantity.uid, (draft) => {
                      draft.serials = value;
                    })
                  }
                  help="Each unit sold gets a number, counting up from First."
                />
                {quantity.serials ? (
                  <Labelled label="First serial" htmlFor={id("serials-first")}>
                    <NumberInput
                      id={id("serials-first")}
                      placeholder="1"
                      value={quantity.serialsFirst}
                      onValue={(value) =>
                        change(quantity.uid, (draft) => {
                          draft.serialsFirst = value;
                        })
                      }
                    />
                  </Labelled>
                ) : null}
              </>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <p
                id={id("proceeds")}
                className="text-xs font-medium text-fd-muted-foreground"
              >
                Proceeds
                <span className="font-normal">
                  {" "}
                  · balances a take's Price is paid into
                </span>
              </p>
              {balanceFields.length === 0 ? (
                <p className="text-xs text-fd-muted-foreground/80">
                  Add a balance to collect proceeds.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {balanceFields.map((field) => {
                    const chosen = quantity.proceeds.includes(field.uid);
                    const full =
                      !chosen && quantity.proceeds.length >= PROCEEDS_MAX;
                    return (
                      <button
                        key={field.uid}
                        type="button"
                        aria-pressed={chosen}
                        disabled={full}
                        onClick={() =>
                          change(quantity.uid, (draft) => {
                            draft.proceeds = chosen
                              ? draft.proceeds.filter(
                                  (uid) => uid !== field.uid,
                                )
                              : [...draft.proceeds, field.uid];
                          })
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors disabled:opacity-50",
                          chosen
                            ? "border-fd-primary/40 bg-fd-primary/10 text-fd-primary"
                            : "text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground",
                        )}
                      >
                        {field.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <Problem id={id("proceeds")} />
            </div>
            <Switch
              id={id("closed")}
              label="Closed"
              checked={quantity.closed}
              onChecked={(value) =>
                change(quantity.uid, (draft) => {
                  draft.closed = value;
                })
              }
              help="The sale is over: Open throws in this build."
            />
          </Card>
        );
      })}
      <AddButton
        onClick={() =>
          update((draft) => {
            draft.quantities.push({
              uid: makeUid(),
              name: "",
              mode: "Final",
              parts: "2",
              stock: "100",
              serials: false,
              serialsFirst: "1",
              proceeds: [],
              closed: false,
            });
          })
        }
      >
        Add quantity
      </AddButton>
    </>
  );
}
