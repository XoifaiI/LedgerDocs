import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import Link from "next/link";

const sample = `type PlayerData = { Gold: number, Items: { string } }

type PlayerOps = {
	AddGold: { Amount: number },
	SpendGold: { Amount: number },
	BuyItem: { Item: string, Price: number },
}

local PlayerStore = Ledger.New<<PlayerData, PlayerOps>>({
	Name = "PlayerData",
	Keys = "Player",
	Default = { Gold = 0, Items = {} },
	MustExist = false,
	Erasable = true,
	Balances = {
		Gold = { Credit = "AddGold", Debit = "SpendGold" },
	},
	Reducer = function(Data, Op)
		if Op.Kind == "BuyItem" then
			if Data.Gold < Op.Price or table.find(Data.Items, Op.Item) then
				return nil
			end

			local Items = table.clone(Data.Items)
			table.insert(Items, Op.Item)

			local New = table.clone(Data)
			New.Gold -= Op.Price
			New.Items = Items
			return New
		end

		return nil
	end,
})

local Session = PlayerStore:Load(Player)
if Session then
	local Ok, Why = Session:Apply({ Kind = "BuyItem", Item = "Sword", Price = 50 })
	if not Ok then
		warn("Couldn't buy the sword:", Why)
	end
end`;

const features = [
  {
    title: "Every change saved once",
    body: "A change is never applied twice, even when a server crashes mid-save or a DataStore outage makes Ledger send it again.",
  },
  {
    title: "Your rules decide",
    body: "Your reducer says whether each change is allowed. If a player can't afford something, it's refused on every server, every time.",
  },
  {
    title: "Trades that can't half happen",
    body: "Ledger.Tx changes several players or keys at once: all of them or none. It works across servers, and for players who are offline.",
  },
  {
    title: "Answers you can act on",
    body: "Every call answers true, or one of 15 reasons. Each reason means one thing and has one thing to do about it.",
  },
  {
    title: "Limited items and counters",
    body: "Sell a fixed stock from every server at once without overselling, and keep totals the whole game adds to.",
  },
  {
    title: "Updates that keep old saves",
    body: "Change the shape of your data with migrations. Old servers and new ones can run side by side during an update.",
  },
];

export default async function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Ledger
        </h1>
        <p className="mt-4 text-lg text-fd-muted-foreground">
          Player data for Roblox that can't be duplicated or lost halfway. You
          describe each change, your own function decides if it's allowed, and
          Ledger saves it exactly once.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground"
          >
            Read the docs
          </Link>
          <Link
            href="/docs/learn/getting-started"
            className="rounded-lg border px-5 py-2.5 font-medium"
          >
            Get started
          </Link>
        </div>

        <div className="mt-12">
          <ServerCodeBlock
            code={sample}
            lang="luau"
            themes={{ light: "github-light", dark: "github-dark" }}
          />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-fd-card p-5"
            >
              <h2 className="font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
