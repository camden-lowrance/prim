import { linkKey } from "./projector";
import type { PrimInvokeRequest, SubjectState } from "./types";

export interface TransitionCheck {
  accepted: boolean;
  reason?: string;
  warnings: string[];
}

export function validateTransition(
  request: PrimInvokeRequest,
  state: SubjectState
): TransitionCheck {
  const warnings: string[] = [];

  if (request.op === "observe" || request.op === "record") {
    return { accepted: true, warnings };
  }

  if (state.status === "complete" && request.op !== "link") {
    return {
      accepted: false,
      reason: "subject is complete",
      warnings
    };
  }

  if (request.op === "ask") {
    return { accepted: true, warnings };
  }

  if (request.op === "claim") {
    const scope = String(request.input.scope);
    const existing = state.claims.find((claim) => claim.scope === scope);

    if (existing && existing.actor.id !== request.actor.id) {
      return {
        accepted: false,
        reason: `scope already claimed by ${existing.actor.id}`,
        warnings
      };
    }
  }

  if (request.op === "decide") {
    const questionId = request.input.closes_question_id;
    if (typeof questionId === "string") {
      const match = state.open_questions.some((question) => question.id === questionId);
      if (!match) {
        warnings.push(`no open question found for ${questionId}`);
      }
    }
  }

  if (request.op === "link") {
    const key = linkKey(request.input.target as never);
    const duplicate = state.links.some((link) => linkKey(link) === key);
    if (duplicate) {
      warnings.push("link already exists");
    }
  }

  if (request.op === "complete") {
    const blockers = state.open_questions.filter((question) => question.blocking);
    if (blockers.length > 0) {
      return {
        accepted: false,
        reason: "blocking questions remain open",
        warnings
      };
    }
  }

  return { accepted: true, warnings };
}
