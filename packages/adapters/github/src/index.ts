import type { ActorRef, ExternalRef, PrimInvokeRequest, SubjectRef } from "../../../core/src/types";

export interface GitHubPullRequestRef {
  owner: string;
  repo: string;
  number: number;
  url: string;
  state?: "open" | "closed" | "merged";
}

export function githubPrTarget(pr: GitHubPullRequestRef): ExternalRef {
  return {
    type: "github_pr",
    id: `${pr.owner}/${pr.repo}#${pr.number}`,
    url: pr.url,
    title: pr.state ? `GitHub PR ${pr.number} (${pr.state})` : `GitHub PR ${pr.number}`
  };
}

export function linkGitHubPrRequest(
  subject: SubjectRef,
  actor: ActorRef,
  pr: GitHubPullRequestRef
): PrimInvokeRequest {
  return {
    op: "link",
    actor,
    subject,
    input: {
      target: githubPrTarget(pr)
    }
  };
}

