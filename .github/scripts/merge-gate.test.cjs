/* eslint-disable @typescript-eslint/no-require-imports -- Node's dependency-free CJS test runner exercises the github-script module */
/* global require */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { evaluateApprovals, runGate } = require("./merge-gate.cjs");

const sha = "a".repeat(40);
const human = { login: "maintainer", type: "User" };
const bot = { login: "agent-notmike101[bot]", type: "Bot" };
const approval = {
  id: 1, user: bot,
  body: `AI-APPROVED: ${sha}\nReviewer: AI subagent\nReviewed the changes and regression coverage.`,
};
const review = {
  id: 1, user: human, state: "APPROVED", commit_id: sha,
  author_association: "OWNER",
};
const evaluate = (comments = [approval], reviews = [review], head = sha) =>
  evaluateApprovals({ comments, reviews, sha: head, author: "contributor" });

test("both current approvals pass; either missing approval fails with actionable feedback", () => {
  assert.equal(evaluate().state, "success");
  assert.deepEqual(evaluate([], []), {
    state: "failure", description: "Missing AI approval and human approval",
  });
  assert.equal(evaluate([], [review]).description, "Missing AI approval");
  assert.equal(evaluate([approval], []).description, "Missing human approval");
});

test("AI approval requires the trusted bot, an exact marker, disclosure, reasoning and current SHA", () => {
  for (const change of [
    { user: human },
    { user: { login: "other[bot]", type: "Bot" } },
    { user: { ...bot, type: "User" } },
    { body: `Quoted: ${approval.body}` },
    { body: `AI-APPROVED: ${sha}\nLooks good` },
    { body: `AI-APPROVED: ${sha}\nReviewer: AI subagent\n` },
    { body: approval.body.replace(sha, "b".repeat(40)) },
  ]) assert.equal(evaluate([{ ...approval, ...change }]).state, "failure");
  assert.equal(evaluate([approval], [review], "b".repeat(40)).state, "failure");
});

test("latest bot decision revokes approval; edited/deleted approvals no longer count", () => {
  const revoked = { ...approval, id: 2, body: `AI-CHANGES-REQUESTED: ${sha}\nReviewer: AI subagent\nFix the failing case.` };
  assert.equal(evaluate([approval, revoked]).state, "failure");
  assert.equal(evaluate([{ ...approval, body: "Approval withdrawn" }]).state, "failure");
  assert.equal(evaluate([]).state, "failure");
  assert.equal(evaluate([revoked, { ...approval, id: 3 }]).state, "success");
});

test("human approval excludes bots, PR author, outsiders and stale commits", () => {
  for (const change of [
    { user: bot }, { user: { login: "contributor", type: "User" } },
    { author_association: "NONE" }, { state: "COMMENTED" },
    { commit_id: "b".repeat(40) },
  ]) assert.equal(evaluate([approval], [{ ...review, ...change }]).state, "failure");
});

test("latest decisive review controls approval; comments preserve it; any change request blocks", () => {
  const changes = { ...review, id: 2, state: "CHANGES_REQUESTED" };
  assert.equal(evaluate([approval], [review, changes]).state, "failure");
  assert.equal(evaluate([approval], [review, { ...review, id: 2, state: "DISMISSED" }]).state, "failure");
  assert.equal(evaluate([approval], [review, { ...review, id: 2, state: "COMMENTED" }]).state, "success");
  assert.equal(evaluate([approval], [review, { ...changes, user: { login: "second", type: "User" } }]).state, "failure");
  assert.equal(evaluate([approval], [changes, { ...review, id: 3 }]).state, "success");
});

function apiFixture({ base = "main", state = "open", comments = [approval], reviews = [review], changedHead = false, readError = false } = {}) {
  const statuses = [];
  const failures = [];
  const calls = [];
  let reads = 0;
  const pr = { number: 51, state, base: { ref: base }, head: { sha }, user: { login: "contributor" } };
  const listComments = Symbol("comments");
  const listReviews = Symbol("reviews");
  const listPulls = Symbol("pulls");
  return {
    statuses, failures, calls,
    github: {
      rest: {
        pulls: {
          get: async (args) => {
            calls.push(args);
            reads++;
            return { data: changedHead && reads > 1 ? { ...pr, head: { sha: "b".repeat(40) } } : pr };
          },
          list: listPulls, listReviews,
        },
        issues: { listComments },
        repos: { createCommitStatus: async (status) => statuses.push(status) },
      },
      paginate: async (method, args) => {
        calls.push(args);
        if (method === listPulls) return [pr];
        if (readError) throw new Error("GitHub unavailable");
        return method === listComments ? comments : reviews;
      },
    },
    context: {
      repo: { owner: "notmike101", repo: "meal-mind" },
      eventName: "pull_request_target", payload: { pull_request: { number: 51 } },
      serverUrl: "https://github.com", runId: 123,
    },
    core: { info: () => {}, error: () => {}, setFailed: (message) => failures.push(message) },
  };
}

test("runner posts pending then current head success with the required context", async () => {
  const fixture = apiFixture();
  await runGate(fixture);
  assert.deepEqual(fixture.statuses.map((status) => status.state), ["pending", "success"]);
  assert.ok(fixture.statuses.every((status) => status.context === "merge-gate" && status.sha === sha));
  assert.equal(fixture.statuses[1].target_url, "https://github.com/notmike101/meal-mind/actions/runs/123");
  assert.equal(fixture.failures.length, 0);
  assert.ok(fixture.calls.some((args) => args.issue_number === 51 && args.per_page === 100));
});

test("runner fails closed for missing approvals, API errors and a concurrent push", async () => {
  for (const options of [{ comments: [] }, { readError: true }, { changedHead: true }]) {
    const fixture = apiFixture(options);
    await runGate(fixture);
    assert.deepEqual(fixture.statuses.map((status) => status.state), ["pending", "failure"]);
    assert.equal(fixture.failures.length, 1);
  }
});

test("runner ignores ordinary issues, non-main PRs and closed PRs", async () => {
  for (const options of [{ base: "release" }, { state: "closed" }]) {
    const fixture = apiFixture(options);
    await runGate(fixture);
    assert.equal(fixture.statuses.length, 0);
  }
  const fixture = apiFixture();
  fixture.context.eventName = "issue_comment";
  fixture.context.payload = { issue: { number: 51 } };
  await runGate(fixture);
  assert.equal(fixture.calls.length, 0);
});

test("comment, review and manual events re-read open main PRs", async () => {
  for (const eventName of ["issue_comment", "workflow_run", "workflow_dispatch"]) {
    const fixture = apiFixture();
    fixture.context.eventName = eventName;
    fixture.context.payload = { issue: { number: 51, pull_request: {} } };
    await runGate(fixture);
    assert.equal(fixture.statuses.at(-1).state, "success");
    if (eventName !== "issue_comment") assert.ok(fixture.calls.some((args) => args.base === "main" && args.state === "open"));
  }
});
