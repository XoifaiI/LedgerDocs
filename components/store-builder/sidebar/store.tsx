"use client";

import { CASINGS, type Casing } from "@/lib/store-builder/casing";
import { settingId } from "@/lib/store-builder/problem";
import type { Project } from "@/lib/store-builder/project";
import { Labelled, Segmented, Switch, TextInput } from "../controls";
import type { Update } from "../use-project";

const id = settingId.store;

const CASING_EXAMPLES: Record<Casing, string> = {
  pascal: "local function BuyItem(Data, Op), as in Ledger's docs.",
  camel: "local function buyItem(data, op), as in Roblox's style guide.",
  snake: "local function buy_item(data, op).",
};

export function StoreSettings({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const { store } = project;
  const set = <Key extends keyof Project["store"]>(
    key: Key,
    value: Project["store"][Key],
  ) =>
    update((draft) => {
      draft.store[key] = value;
    });

  return (
    <>
      <Labelled
        label="DataStore name"
        htmlFor={id("name")}
        help="Never change it once players have data: a new name is a new, empty store."
      >
        <TextInput
          id={id("name")}
          mono
          value={store.name}
          onValue={(value) => set("name", value)}
        />
      </Labelled>
      <Labelled
        label="Keys"
        htmlFor={id("keys")}
        help={
          store.keys === "Player"
            ? "One key per player. Ledger loads it when they join."
            : "Keys you choose, like a guild id or a shop name."
        }
      >
        <Segmented
          id={id("keys")}
          label="Keys"
          value={store.keys}
          options={[
            ["Player", "Player"],
            ["String", "String"],
          ]}
          onValue={(value) => set("keys", value)}
        />
      </Labelled>
      <div className="grid grid-cols-2 gap-2">
        <Labelled
          label="Store variable"
          htmlFor={id("variable")}
          className="col-span-2"
        >
          <TextInput
            id={id("variable")}
            mono
            value={store.variable}
            onValue={(value) => set("variable", value)}
          />
        </Labelled>
        <Labelled label="Data type" htmlFor={id("data-type")}>
          <TextInput
            id={id("data-type")}
            mono
            value={store.dataType}
            onValue={(value) => set("dataType", value)}
          />
        </Labelled>
        <Labelled label="Ops type" htmlFor={id("ops-type")}>
          <TextInput
            id={id("ops-type")}
            mono
            value={store.opsType}
            onValue={(value) => set("opsType", value)}
          />
        </Labelled>
        <Labelled
          label="Ledger lives at"
          htmlFor={id("ledger-path")}
          className="col-span-2"
        >
          <TextInput
            id={id("ledger-path")}
            mono
            value={store.ledgerPath}
            onValue={(value) => set("ledgerPath", value)}
          />
        </Labelled>
      </div>
      <Labelled
        label="Code style"
        htmlFor={id("casing")}
        help={`${CASING_EXAMPLES[store.casing]} Names you type, your fields and ops, and Ledger's keys stay as they are.`}
      >
        <Segmented
          id={id("casing")}
          label="Code style"
          value={store.casing}
          options={CASINGS}
          onValue={(value) => set("casing", value)}
        />
      </Labelled>
      <Switch
        id={id("must-exist")}
        label="MustExist"
        checked={store.mustExist}
        onChecked={(value) => set("mustExist", value)}
        help="Changing a key with no saved data answers Missing, instead of starting it from Default."
      />
      <Switch
        id={id("erasable")}
        label="Erasable"
        checked={store.erasable}
        onChecked={(value) => set("erasable", value)}
        help="Lets Erase remove a key. Decide before you go live."
      />
    </>
  );
}
