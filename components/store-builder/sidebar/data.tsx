"use client";

import { settingId } from "@/lib/store-builder/problem";
import {
  type DataField,
  FIELD_TYPE_ORDER,
  FIELD_TYPES,
  type FieldType,
  makeUid,
  type Project,
} from "@/lib/store-builder/project";
import {
  AddButton,
  Card,
  Intro,
  Labelled,
  Problem,
  RemoveButton,
  Select,
  TextInput,
} from "../controls";
import type { Update } from "../use-project";

const TYPE_OPTIONS = FIELD_TYPE_ORDER.map(
  (type) => [type, FIELD_TYPES[type].label] as const,
);

const STARTS: Partial<Record<FieldType, string>> = {
  number: "0",
  string: "",
  boolean: "false",
};

export function DataSettings({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const change = (uid: string, edit: (field: DataField) => void) =>
    update((draft) => {
      const field = draft.fields.find((candidate) => candidate.uid === uid);
      if (field) {
        edit(field);
      }
    });

  return (
    <>
      <Intro>
        Every field the data will ever have, and what a new key starts with.
      </Intro>
      {project.fields.map((field) => {
        const id = (part: string) => settingId.field(field.uid, part);
        return (
          <Card key={field.uid}>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2">
              <TextInput
                id={id("name")}
                aria-label="Field name"
                mono
                value={field.name}
                onValue={(value) =>
                  change(field.uid, (draft) => {
                    draft.name = value;
                  })
                }
              />
              <Select
                id={id("type")}
                label="Field type"
                value={field.type}
                options={TYPE_OPTIONS}
                onValue={(type) =>
                  change(field.uid, (draft) => {
                    draft.type = type;
                    draft.def = STARTS[type] ?? (type === "luau" ? "{}" : "");
                  })
                }
              />
              <RemoveButton
                label={`Remove ${field.name || "field"}`}
                onClick={() =>
                  update((draft) => {
                    draft.fields = draft.fields.filter(
                      (candidate) => candidate.uid !== field.uid,
                    );
                    draft.balances = draft.balances.filter(
                      (balance) => balance.field !== field.uid,
                    );
                    for (const quantity of draft.quantities) {
                      quantity.proceeds = quantity.proceeds.filter(
                        (uid) => uid !== field.uid,
                      );
                    }
                  })
                }
              />
            </div>
            <Problem id={id("name")} />
            {FIELD_TYPES[field.type].hint ? (
              <p className="text-xs text-fd-muted-foreground/80">
                {FIELD_TYPES[field.type].hint}
              </p>
            ) : null}
            {field.type === "number" || field.type === "string" ? (
              <Labelled label="Starts at" htmlFor={id("default")}>
                <TextInput
                  id={id("default")}
                  mono={field.type === "number"}
                  inputMode={field.type === "number" ? "decimal" : undefined}
                  placeholder={field.type === "number" ? "0" : "empty"}
                  value={field.def}
                  onValue={(value) =>
                    change(field.uid, (draft) => {
                      draft.def = value;
                    })
                  }
                />
              </Labelled>
            ) : null}
            {field.type === "boolean" ? (
              <Labelled label="Starts at" htmlFor={id("default")}>
                <Select
                  id={id("default")}
                  value={field.def === "true" ? "true" : "false"}
                  options={[
                    ["false", "false"],
                    ["true", "true"],
                  ]}
                  onValue={(value) =>
                    change(field.uid, (draft) => {
                      draft.def = value;
                    })
                  }
                />
              </Labelled>
            ) : null}
            {field.type === "luau" ? (
              <div className="grid grid-cols-2 gap-2">
                <Labelled label="Luau type" htmlFor={id("luau-type")}>
                  <TextInput
                    id={id("luau-type")}
                    mono
                    placeholder="{ [string]: Pet }"
                    value={field.luauType}
                    onValue={(value) =>
                      change(field.uid, (draft) => {
                        draft.luauType = value;
                      })
                    }
                  />
                </Labelled>
                <Labelled label="Starts as" htmlFor={id("default")}>
                  <TextInput
                    id={id("default")}
                    mono
                    placeholder="{}"
                    value={field.def}
                    onValue={(value) =>
                      change(field.uid, (draft) => {
                        draft.def = value;
                      })
                    }
                  />
                </Labelled>
              </div>
            ) : null}
          </Card>
        );
      })}
      <AddButton
        onClick={() =>
          update((draft) => {
            let count = draft.fields.length + 1;
            while (
              draft.fields.some((field) => field.name === `Field${count}`)
            ) {
              count += 1;
            }
            draft.fields.push({
              uid: makeUid(),
              name: `Field${count}`,
              type: "number",
              def: "0",
              luauType: "",
            });
          })
        }
      >
        Add field
      </AddButton>
    </>
  );
}
