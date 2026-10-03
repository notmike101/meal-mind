# Dual approval merge gate

PRs targeting `main` require an AI approval comment and a human GitHub review for
the current head commit. Other target branches are ignored. The required commit
status is named **`merge-gate`**, not the workflow job `evaluate`.

## Reviewer instructions

The separate AI reviewer posts a normal PR conversation comment through the
`agent-notmike101[bot]` GitHub App. Its first two lines must be exactly:

```text
AI-APPROVED: <full 40-character lowercase PR head SHA>
Reviewer: AI subagent
```

Follow those lines with nonempty review reasoning. Do not quote or indent the
marker. Comments from humans or other bots do not count as AI approval. The
implementing agent must not approve its own work; the marker identifies the
trusted posting account, while reviewer independence remains a contribution
policy enforced by the people and agents doing the review.

The latest structured decision from that bot controls the AI gate. To withdraw
approval, edit/delete the approval comment or post:

```text
AI-CHANGES-REQUESTED: <full 40-character lowercase PR head SHA>
Reviewer: AI subagent
Explain what must change.
```

A human owner/member/collaborator other than the PR author must submit **Approve**
through GitHub's review interface on the current head commit. A conversation
comment is insufficient. The latest decisive review per person wins;
`COMMENTED` reviews do not erase an approval, but dismissal does. An outstanding
human changes-requested review blocks the gate, even if another person approves.
New commits require fresh AI and human approvals.

## Workflows and security

- `merge-gate.yml` handles main PR changes, PR conversation comment creation,
  editing/deletion, review signal completion and manual reruns. It posts pending
  before fetching all comment/review pages, then success or failure with the
  missing approval(s). API errors fail closed.
- `merge-gate-tests.yml` tests PR code with read-only permissions. Its review
  signal job handles submitted/edited/dismissed reviews on main PRs, including
  forks. A `workflow_run` event wakes the privileged gate, which re-reads open
  main PRs without trusting artifacts or approval decisions from that run.
- The privileged job checks out only `refs/heads/main`, disables persisted Git
  credentials, and never runs PR code. Its token can read PRs/comments and write
  commit statuses; it cannot merge or change rulesets. Evaluations are serialized
  and the PR head/base are checked again before publishing the result. Every run
  refreshes all open main PRs because GitHub concurrency can replace pending runs.

Commit statuses belong to a SHA, not to an individual PR. If multiple open main
PRs share the same head SHA, **every one of them** must meet both approvals before
that SHA's status can pass. Closing or retargeting a duplicate triggers a fresh
evaluation. Retarget events may run the workflow for another base branch, but
only open PRs currently targeting main receive or affect gate statuses.

When approvals are missing, a failed gate run is expected. On review/manual
signals a run may evaluate multiple PRs; inspect each PR's `merge-gate` status
rather than treating the aggregate workflow result as that PR's decision.
Comments/reviews posted using `GITHUB_TOKEN` do not generally trigger another
workflow. Reviewers should use the GitHub App identity helper or the human UI.
If an event was missed, run **Dual approval merge gate** manually on `main`.

## Required main ruleset

In **Settings → Rulesets → Protect main**, retain the existing deletion and
force-push protections and the default-branch target. Add:

1. **Require a pull request before merging**, with **1** approving review and
   **Dismiss stale pull request approvals when new commits are pushed**.
2. **Require status checks to pass**, with context **`merge-gate`**, ideally
   restricted to **GitHub Actions** as the expected source. Require branches to
   be up to date before merging.
3. Keep enforcement **Active** and the bypass list empty.

A workflow alone does not block merges. The required status and native review
rule must both be enabled. The native review rule also prevents direct pushes
to `main` and protects against approvals that GitHub itself considers invalid.

### First installation

The privileged workflow and review/comment triggers must exist on `main` before
they become active. The installation PR runs the read-only gate tests, but
cannot run the new trusted gate from `main` before it is merged. Requiring
`merge-gate` before that bootstrap merge leaves the installation PR waiting for
a status that does not yet exist. Coordinate activation with the human reviewer:
merge the independently approved installation PR under the existing policy,
then enable the required `merge-gate` status and manually evaluate open main PRs.
Do not bypass reviews or publish a fabricated passing status for installation.

Local verification (no app runtime or Docker needed):

```bash
node --test .github/scripts/merge-gate.test.cjs
npm run lint
```

References: [workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
[review API](https://docs.github.com/en/rest/pulls/reviews),
[required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
