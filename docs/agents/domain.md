# Domain Docs

How the engineering skills should consume domain documentation when exploring this repo.

This repo is part of the db-accessor system. Shared domain vocabulary and system-wide decisions live in the sibling backend repo `db-accessor`, expected at `../db-accessor/` relative to this repo's root.

## Before exploring, read these

- **`../db-accessor/GLOSSARY.md`**: the shared domain glossary for the whole system.
- **`../db-accessor/docs/adr/`**: read ADRs that touch the area you're about to work in.
- **`GLOSSARY.md`** and **`docs/adr/`** at this repo's root, if they exist: terms and decisions specific to this repo.

If any of these files don't exist (including when the sibling checkout isn't present), **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved. System-wide terms belong in the backend glossary; record decisions scoped to this repo in this repo's `docs/adr/`.

## File structure

```
DB-ACCESSOR/
├── db-accessor/
│   ├── GLOSSARY.md          ← shared domain glossary
│   └── docs/adr/            ← system-wide decisions
└── <this repo>/
    └── docs/adr/            ← decisions scoped to this repo (created lazily)
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the glossary. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
