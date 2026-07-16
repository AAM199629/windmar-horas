import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// Versión visible en la app: SHA de git + fecha del commit.
// En Vercel usamos la env var del build; en local caemos a `git`.
function resolveVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? tryGit("git rev-parse HEAD");
  const short = sha ? sha.slice(0, 7) : "dev";

  const date = tryGit("git log -1 --format=%cd --date=short") ?? "";

  return date ? `${short} · ${date}` : short;
}

function tryGit(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveVersion(),
  },
};

export default nextConfig;
