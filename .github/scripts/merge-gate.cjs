/* global module */
function evaluateApprovals({ comments, reviews, sha, author }) {
  const decisions = comments.filter((comment) =>
    comment.user?.login === "agent-notmike101[bot]" && comment.user.type === "Bot" &&
    /^AI-(APPROVED|CHANGES-REQUESTED): [a-f0-9]{40}\r?\n/.test(comment.body ?? ""),
  ).sort((a, b) => a.id - b.id);
  const latest = decisions.at(-1);
  const ai = latest?.body.replace(/\r\n/g, "\n").startsWith(
    `AI-APPROVED: ${sha}\nReviewer: AI subagent\n`,
  ) && latest.body.split(/\r?\n/).slice(2).join("\n").trim().length > 0;

  const latestReviews = new Map();
  for (const review of [...reviews].sort((a, b) => a.id - b.id)) {
    if (review.user?.type !== "User" || review.user.login === author ||
        !["OWNER", "MEMBER", "COLLABORATOR"].includes(review.author_association)) continue;
    if (["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state)) {
      latestReviews.set(review.user.login, review);
    }
  }
  const current = [...latestReviews.values()];
  const human = current.some((review) => review.state === "APPROVED" && review.commit_id === sha) &&
    !current.some((review) => review.state === "CHANGES_REQUESTED");
  const missing = [!ai && "AI approval", !human && "human approval"].filter(Boolean);
  return missing.length
    ? { state: "failure", description: `Missing ${missing.join(" and ")}` }
    : { state: "success", description: "AI and human approvals match the current commit" };
}

async function runGate({ github, context, core }) {
  const repo = context.repo;
  const payload = context.payload;
  if (context.eventName === "issue_comment") {
    if (!payload.issue.pull_request) return;
  }
  // GitHub concurrency may replace a pending run. Every surviving run refreshes
  // all main PRs so an event for another PR cannot leave a stale passing status.
  // Review signals carry no trusted artifacts; all state comes from the API.
  const prs = await github.paginate(github.rest.pulls.list, { ...repo, state: "open", base: "main", per_page: 100 });

  let failed = false;
  for (const { number: pull_number } of prs) {
    const { data: pr } = await github.rest.pulls.get({ ...repo, pull_number });
    if (pr.state !== "open" || pr.base.ref !== "main") continue;
    const status = {
      ...repo, sha: pr.head.sha, context: "merge-gate",
      target_url: `${context.serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${context.runId}`,
    };
    await github.rest.repos.createCommitStatus({ ...status, state: "pending", description: "Checking current AI and human approvals" });
    try {
      const [comments, reviews] = await Promise.all([
        github.paginate(github.rest.issues.listComments, { ...repo, issue_number: pull_number, per_page: 100 }),
        github.paginate(github.rest.pulls.listReviews, { ...repo, pull_number, per_page: 100 }),
      ]);
      let result = evaluateApprovals({ comments, reviews, sha: pr.head.sha, author: pr.user.login });
      const { data: current } = await github.rest.pulls.get({ ...repo, pull_number });
      if (current.head.sha !== pr.head.sha || current.base.ref !== "main" || current.state !== "open") {
        result = { state: "failure", description: "PR changed during evaluation; waiting for its next event" };
      }
      await github.rest.repos.createCommitStatus({ ...status, ...result });
      core.info(`PR #${pull_number}: ${result.description}`);
      failed ||= result.state !== "success";
    } catch (error) {
      await github.rest.repos.createCommitStatus({ ...status, state: "failure", description: "Unable to read approvals; rerun the merge gate" });
      core.error(error);
      failed = true;
    }
  }
  if (failed) core.setFailed("One or more main PRs are missing current approvals; see merge-gate statuses");
}

module.exports = { evaluateApprovals, runGate };
