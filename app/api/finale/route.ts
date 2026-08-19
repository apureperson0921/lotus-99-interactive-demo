import { commitFinaleDecision, commitFinaleWorkflow, getWorkflow } from "../../workflow-store";
import { openWorkflowToken, sealWorkflow } from "../../workflow-token";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { sessionId?: string; workflowToken?: string; choice?: string };
    const sessionId = body.sessionId?.trim();
    const workflowToken = body.workflowToken?.trim();
    const choice = body.choice === "destroy" || body.choice === "preserve" ? body.choice : undefined;
    if ((!sessionId && !workflowToken) || !choice) return Response.json({ error: "finale_session_or_choice_missing" }, { status: 400 });

    const workflow = workflowToken ? await openWorkflowToken(workflowToken) : sessionId ? getWorkflow(sessionId) : undefined;
    const result = workflow
      ? commitFinaleWorkflow(workflow, choice)
      : sessionId ? commitFinaleDecision(sessionId, choice) : { ok: false as const, reason: "workflow_missing" as const };
    if (!result.ok) {
      const status = result.reason === "workflow_missing" || result.reason === "finale_already_decided" ? 409 : 400;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({
      workflowToken: await sealWorkflow(result.workflow),
      ending: {
        id: result.option.id,
        title: result.option.video.title,
        summary: result.option.summary,
        video: {
          status: result.option.video.url && result.option.video.status !== "pending" ? "ready" : "pending",
          ...(result.option.video.url ? { url: result.option.video.url } : {}),
          ...(result.option.video.poster ? { poster: result.option.video.poster } : {}),
        },
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "finale_failed" }, { status: 500 });
  }
}
