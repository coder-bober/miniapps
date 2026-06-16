# Changelog guidelines

This project keeps two changelog styles because they serve different readers.

## `docs/short-summary-changelog.md`

Use this for concise release-style summaries.

Update it when a change affects user-visible behavior, setup/configuration, workflows, module capabilities, access-control behavior, data ownership semantics, migrations, or documented commands.

Entry style:

- Short bullets.
- Prefer outcomes over implementation details.
- Include new/removed commands, config flags, SQL files, migration notes, and important behavior changes.
- Keep enough context for a reader skimming recent project history.

## `docs/problem-solution-changelog.md`

Use this for implementation notes that explain why a change happened and how it was solved.

Update it when a change involved a non-obvious bug, design tradeoff, refactor, migration, compatibility issue, data model/access-control decision, or operational lesson.

Entry style:

```markdown
## Short descriptive title

Problem: what was wrong or confusing.

Solution: what changed and why this solves it.
```

Keep entries focused. Do not paste raw logs unless the exact output is important.

## Rotation

Before appending to any changelog, check the target file size.

If a changelog file is larger than 20 KB, rotate it before writing the new entry:

1. Create `docs/old-changelogs/` if it does not already exist.
2. Move the oversized changelog into `docs/old-changelogs/`.
3. Use a unique archived filename that preserves the original changelog name and date, for example:
   - `docs/old-changelogs/problem-solution-changelog-2026-05-30.md`
   - `docs/old-changelogs/short-summary-changelog-2026-05-30.md`
4. Recreate the active changelog file with its normal title and add the new entry there.
5. Do not split or rewrite old entries during rotation unless explicitly asked.

This rotation rule applies to every changelog file in `docs/`, including `short-summary-changelog.md`, `problem-solution-changelog.md`, and any future changelog files.

## Plan-step completion rule

After successfully completing a step in a plan, update the relevant changelog file(s) and commit the completed step when all of the following are true:

- the step completed without errors;
- verification passed;
- there are no unresolved questions that require user input before committing;
- the commit can be scoped cleanly to the completed step.

Use the rule of thumb below to choose which changelog files to update.

## Rule of thumb

- Small obvious docs/test-only cleanup: usually no changelog update needed unless it completes a tracked plan step.
- User-facing feature, workflow, config, migration, or access-control behavior change: update `short-summary-changelog.md`.
- Non-trivial debugging, refactor, data-model decision, compatibility behavior, or design decision: update `problem-solution-changelog.md`.
- If both apply, update both: short summary in the former, rationale in the latter.

## Historical plans

Older files under `docs/plans/` may mention previous paths or completed migration steps. Prefer adding a status note at the top of historical plans instead of rewriting all old step-by-step instructions, unless stale text is likely to mislead active work.
