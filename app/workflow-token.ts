import type { CompiledWorkflow } from "./workflow-store";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function tokenKey() {
  const secret = process.env.WORKFLOW_TOKEN_SECRET || process.env.DEEPSEEK_API_KEY;
  if (!secret) throw new Error("workflow_token_secret_missing");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealWorkflow(workflow: CompiledWorkflow) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await tokenKey(),
    encoder.encode(JSON.stringify(workflow)),
  );
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

export async function openWorkflowToken(token: string): Promise<CompiledWorkflow> {
  const [ivPart, payloadPart, extra] = token.split(".");
  if (!ivPart || !payloadPart || extra) throw new Error("workflow_token_invalid");
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(ivPart) },
      await tokenKey(),
      fromBase64Url(payloadPart),
    );
    const workflow = JSON.parse(decoder.decode(decrypted)) as CompiledWorkflow;
    if (!workflow?.storyPackage || !workflow?.runtimePackage) throw new Error("workflow_token_shape_invalid");
    return workflow;
  } catch {
    throw new Error("workflow_token_invalid");
  }
}
