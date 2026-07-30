import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import Link from "next/link";

const sample = `local Store = Ledger.New({
	Name = "PlayerData",
	Default = { Gold = 100, Items = {} },
	Reducer = function(State, Op)
		if Op.Kind == "SpendGold" then
			if Op.Amount > State.Gold then
				return nil -- refused, on every server, forever
			end
			local Next = table.clone(State)
			Next.Gold -= Op.Amount
			return Next
		end
		return nil
	end,
})

Store:Load(Player)
Store:Expect(Player):Apply("SpendGold", { Amount = 25 })`;

const features = [
  {
    title: "No session locks",
    body: "Two servers can write the same key at once. The fold decides who wins and every server gets the same answer. Nothing to lease, nothing to wait out after a crash.",
  },
  {
    title: "A reducer you own",
    body: "State is a pure fold over a log of ops. Your reducer decides if each one is allowed, so the bad state is unreachable instead of being caught after the fact.",
  },
  {
    title: "Money that moves properly",
    body: "Transfers move a balance through an escrow, deduped by id, and they fix themselves after a crash. Transactions commit two to four keys, all or nothing.",
  },
  {
    title: "Once, forever",
    body: "Name an op after a receipt or an order and it applies one time on that key, across compaction, rejoins, and two servers racing the same replay.",
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
          Player data as a ledger, not a document. You never write state. You
          write down the change you want, a function you own decides if it's
          allowed, and state is what falls out of replaying those changes.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground"
          >
            Read the docs
          </Link>
          <Link
            href="/docs/getting-started"
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
