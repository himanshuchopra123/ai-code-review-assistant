import { createSign } from "crypto";

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateAppJWT(): string {
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const appId = process.env.GITHUB_APP_ID!;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId })
  );

  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = base64url(signer.sign(privateKey));

  return `${signingInput}.${signature}`;
}

export async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = generateAppJWT();

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ai-code-reviewer",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Installation token request failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { token: string };
  return data.token;
}
