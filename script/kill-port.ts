const port = process.env.PORT || "5000";

async function killPortOnWindows(): Promise<void> {
  const proc = Bun.spawn(["netstat", "-ano"], { stdout: "pipe" });
  const output = await new Response(proc.stdout).text();
  await proc.exited;

  const pids = new Set<string>();
  for (const line of output.split("\n")) {
    if (!line.includes(`:${port}`)) continue;
    // LISTENING (en) / ÉCOUTE (fr) and similar localized netstat states
    if (!/LISTENING|ÉCOUTE|ABHÖREN|IN ASCOLTO|ESCUCHA/i.test(line)) continue;

    const parts = line.trim().split(/\s+/);
    const pid = parts.at(-1);
    if (pid && /^\d+$/.test(pid) && pid !== "0") {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    const kill = Bun.spawn(["taskkill", "/PID", pid, "/F"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await kill.exited;
  }
}

async function killPortOnUnix(): Promise<void> {
  const proc = Bun.spawn(["sh", "-c", `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

await (process.platform === "win32" ? killPortOnWindows() : killPortOnUnix());
