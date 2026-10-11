"use client";

import { DEFAULT_KICK_MESSAGE } from "@/lib/store-builder/limits";
import { settingId } from "@/lib/store-builder/problem";
import type { Project } from "@/lib/store-builder/project";
import { Intro, Labelled, Switch, TextInput } from "../controls";
import type { Update } from "../use-project";

const id = settingId.players;

export function PlayerSettings({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const { players } = project;
  return (
    <>
      <Intro>What happens when a player's data won't load.</Intro>
      <Switch
        id={id("kick")}
        label="Kick them"
        checked={players.kick}
        onChecked={(value) =>
          update((draft) => {
            draft.players.kick = value;
          })
        }
        help="Off lets them play on with no data loaded. Your scripts must then cope."
      />
      {players.kick ? (
        <Labelled label="Kick message" htmlFor={id("kick-message")}>
          <TextInput
            id={id("kick-message")}
            placeholder={DEFAULT_KICK_MESSAGE}
            value={players.kickMessage}
            onValue={(value) =>
              update((draft) => {
                draft.players.kickMessage = value;
              })
            }
          />
        </Labelled>
      ) : null}
      <Switch
        id={id("warn")}
        label="Warn in the output"
        checked={players.warnOnLoadFailed}
        onChecked={(value) =>
          update((draft) => {
            draft.players.warnOnLoadFailed = value;
          })
        }
        help="Adds an OnLoadFailed that warns with the player and the reason."
      />
    </>
  );
}
