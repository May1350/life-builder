# Life Builder — Lifetime Time Management Adviser

An AI-augmented advisor that connects **lifetime-scale goals** to **daily schedules**, built with Next.js + TypeScript.

**Author**: [@May1350](https://github.com/May1350) · Keio Univ. Faculty of Business & Commerce · 2026-

Status: 🚧 **Early stage** — boilerplate + architecture design phase. MVP targeted for 2026 Q3.

---

## Why

Most time-management tools work at one of two scales:

- **Short**: calendar apps, to-do lists (day / week)
- **Long**: journals, vision boards (year / decade)

But the hard part is **the connection between them**: "Does what I'm doing today actually move me toward what I want in 10 years?"

**Life Builder** is an experiment in closing that gap with an AI agent that:

1. Holds a user's long-term goals (career, health, relationships, personal)
2. Observes daily schedules and outputs
3. Reports back honestly — are you converging or diverging?

## What it will do (MVP)

- **Goal hierarchy**: users define goals at 10-year, 5-year, 1-year, and quarterly scales
- **Daily check-in**: quick input of what the user actually did
- **AI adviser**: LLM evaluates alignment between today's output and long-term goals, with structured feedback
- **No moralizing**: the agent flags drift without scolding — signal, not pressure

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS |
| Auth (planned) | Vercel auth or Clerk |
| DB (planned) | Vercel Postgres |
| AI (planned) | Anthropic Claude API (structured output) |
| Hosting | Vercel |

## Roadmap

- [ ] **M0 (current)**: Next.js scaffold, data model for goal hierarchy
- [ ] **M1**: Daily check-in UI, simple LLM round-trip
- [ ] **M2**: Goal hierarchy editor, weekly digest
- [ ] **M3**: Public beta

## Philosophy

This is a personal project exploring a question I care about:

> "In an era where AI can increasingly do short-term tasks for us, the scarce and compounding human asset becomes the taste to decide what is worth doing at all. Can a tool help us hold that compass steady?"

(Related write-up in my [personal journal](https://github.com/May1350) · 2026-04)

## Contribution

At the moment, this is a solo design exploration, not a team project. If you're working on similar problems, I'd love to talk — reach out via [@May1350](https://github.com/May1350).

## License

TBD (likely MIT once the first public MVP ships).

---

*Built in the same spirit as my other projects: an exploration of how an "AI orchestrator" — someone who directs AI to build useful things rather than coding from scratch — can ship products that matter.*
