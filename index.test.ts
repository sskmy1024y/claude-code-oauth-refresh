import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { saveCredentials } from "./index";

const CREDENTIALS_FILE = "credentials.json";

describe("Update Credentials Feature", () => {
  const CLAUDE_CREDENTIALS_PATH = join(
    homedir(),
    ".claude",
    ".credentials.json"
  );

  beforeEach(async () => {
    // Clean up test files
    if (existsSync(CREDENTIALS_FILE)) {
      await unlink(CREDENTIALS_FILE);
    }
  });

  afterEach(async () => {
    // Clean up test files
    if (existsSync(CREDENTIALS_FILE)) {
      await unlink(CREDENTIALS_FILE);
    }
  });

  describe("saveCredentials", () => {
    test("should save credentials in correct format", async () => {
      const tokens = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000,
        scopes: ["user:inference", "user:profile"],
        isMax: true,
      };

      const result = await saveCredentials(tokens);
      expect(result).toBe(true);

      const content = await readFile(CREDENTIALS_FILE, "utf-8");
      const saved = JSON.parse(content);

      expect(saved.claudeAiOauth).toEqual(tokens);
      // Verify pretty printing
      expect(content).toContain("\n");
      expect(content).toContain("  ");
    });

    test("should handle write errors gracefully", async () => {
      const originalError = console.error;
      console.error = mock(() => {});

      // Create a directory with the credentials file name to cause write error
      await mkdir(CREDENTIALS_FILE).catch(() => {});

      try {
        const tokens = {
          accessToken: "test-token",
          refreshToken: "refresh-token",
          expiresAt: Date.now() + 3600000,
          scopes: ["user:inference"],
          isMax: false,
        };

        const result = await saveCredentials(tokens);
        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining("Error saving credentials:")
        );
      } finally {
        console.error = originalError;
        await rmdir(CREDENTIALS_FILE).catch(() => {});
      }
    });
  });

  describe("CLI Integration", () => {
    test("should show help text", async () => {
      const { spawn } = await import("node:child_process");
      const proc = spawn("bun", ["run", "index.ts", "--help"]);

      let stdout = "";
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      await new Promise<void>((resolve) => {
        proc.on("exit", () => resolve());
      });

      expect(stdout).toContain("Usage:");
      expect(stdout).toContain(
        "Updates GitHub credentials from local Claude credentials"
      );
      expect(stdout).toContain("--help");
    });

    test("should run update process by default", async () => {
      const { spawn } = await import("node:child_process");
      const proc = spawn("bun", ["run", "index.ts"]);

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        proc.on("exit", (code) => resolve(code ?? 1));

        // Add timeout to prevent hanging
        setTimeout(() => {
          proc.kill();
          resolve(1);
        }, 2000);
      });

      const output = stdout + stderr;
      expect(output).toContain("Starting credential update process...");
      expect(output).toContain("Checking prerequisites...");

      // Should fail at some point (claude not installed or credentials not found)
      expect(exitCode).toBe(1);
    });
  });

  describe("saveCredentials integration", () => {
    test("should save credentials from Claude format correctly", async () => {
      const originalError = console.error;
      console.error = mock(() => {});

      try {
        // Test the saveCredentials function with Claude-style credentials
        const claudeStyleCredentials = {
          accessToken: "test-access-token",
          refreshToken: "test-refresh-token",
          expiresAt: Date.now() + 3600000,
          scopes: ["user:inference", "user:profile"],
          isMax: true,
        };

        const result = await saveCredentials(claudeStyleCredentials);
        expect(result).toBe(true);

        // Verify the saved file format
        const savedData = await readFile(CREDENTIALS_FILE, "utf-8");
        const saved = JSON.parse(savedData);

        expect(saved.claudeAiOauth).toEqual(claudeStyleCredentials);
      } finally {
        console.error = originalError;
      }
    });
  });
});

// Helper to create directories (missing from imports)
async function mkdir(path: string) {
  const { mkdir: mkdirFs } = await import("node:fs/promises");
  return mkdirFs(path);
}

async function rmdir(path: string) {
  const { rmdir: rmdirFs } = await import("node:fs/promises");
  return rmdirFs(path);
}
