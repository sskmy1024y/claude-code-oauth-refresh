#!/usr/bin/env bun

import { writeFile, readFile, exists, access } from "node:fs/promises";
import { exec, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";

// Constants
const CREDENTIALS_FILE = "credentials.json";
const CLAUDE_CREDENTIALS_PATH = join(homedir(), ".claude", ".credentials.json");
const CLAUDE_COMMAND_PATH = join(homedir(), ".claude", "local", "claude");

// Types
interface ClaudeOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  isMax: boolean;
}

interface CredentialsFile {
  claudeAiOauth: ClaudeOAuthCredentials;
}

interface ClaudeCredentialsFile {
  claudeAiOauth: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string;
  };
}

/**
 * Checks if the claude command is installed
 */
export async function isClaudeInstalled(): Promise<boolean> {
  // TODO: bashrcを読めないのでwhichコマンドなどでは判定できない。改善する
  return existsSync(CLAUDE_COMMAND_PATH);
}

/**
 * Checks if the Claude credentials file exists
 */
export async function doesClaudeCredentialsExist(): Promise<boolean> {
  try {
    await access(CLAUDE_CREDENTIALS_PATH);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Executes the claude command to refresh credentials
 */
export async function executeClaudeCommand(): Promise<boolean> {
  try {
    // Try multiple approaches to execute the claude command
    console.log("Executing claude command to refresh credentials...");

    // Try to run claude with the original command
    spawnSync("claude", ["", "-p '! pwd'"], {
      encoding: "utf-8",
      stdio: "inherit",
      timeout: 30000, // 30 second timeout
    });

    console.log("Claude command executed successfully");
    return true;
  } catch (error) {
    console.error(
      "Error setting up claude command:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

/**
 * Reads the Claude credentials file
 */
export async function readClaudeCredentials(): Promise<ClaudeCredentialsFile | null> {
  try {
    const data = await readFile(CLAUDE_CREDENTIALS_PATH, "utf-8");
    return JSON.parse(data) as ClaudeCredentialsFile;
  } catch (error) {
    console.error(
      "Error reading Claude credentials:",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Saves OAuth credentials to a JSON file
 */
export async function saveCredentials(
  tokens: ClaudeOAuthCredentials
): Promise<boolean> {
  const credentials: CredentialsFile = {
    claudeAiOauth: tokens,
  };

  try {
    await writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
    return true;
  } catch (error) {
    console.error(
      `Error saving credentials: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}

/**
 * Updates GitHub credentials using Claude credentials
 */
export async function updateGitHubCredentials(): Promise<boolean> {
  // Check prerequisites
  console.log("Checking prerequisites...");

  if (!(await isClaudeInstalled())) {
    console.error("Error: claude command is not installed");
    return false;
  }

  if (!(await doesClaudeCredentialsExist())) {
    console.error(
      `Error: Claude credentials file not found at ${CLAUDE_CREDENTIALS_PATH}`
    );
    return false;
  }

  console.log("Prerequisites met. Executing claude command...");

  // Execute claude command to refresh credentials
  if (!(await executeClaudeCommand())) {
    console.error("Error: Failed to execute claude command");
    return false;
  }

  // Read the updated credentials
  console.log("Reading Claude credentials...");
  const claudeCredentials = await readClaudeCredentials();

  if (!claudeCredentials) {
    console.error("Error: Failed to read Claude credentials");
    return false;
  }

  // Convert to ClaudeOAuthCredentials format
  const credentials: ClaudeOAuthCredentials = {
    accessToken: claudeCredentials.claudeAiOauth.accessToken,
    refreshToken: claudeCredentials.claudeAiOauth.refreshToken,
    expiresAt: claudeCredentials.claudeAiOauth.expiresAt,
    scopes: claudeCredentials.claudeAiOauth.scopes,
    isMax: claudeCredentials.claudeAiOauth.subscriptionType === "max",
  };

  // Save credentials to update GitHub tokens
  console.log("Updating GitHub credentials...");
  return await saveCredentials(credentials);
}

// CLI handling
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: ${process.argv[1]}`);
    console.log("");
    console.log("Updates GitHub credentials from local Claude credentials");
    console.log("");
    console.log("Options:");
    console.log("  --help, -h          Show this help message");
    process.exit(0);
  }

  console.log("Starting credential update process...");

  const success = await updateGitHubCredentials();

  if (success) {
    console.log("\n=== SUCCESS ===");
    console.log("GitHub credentials updated successfully!");
    console.log(`Credentials saved to: ${CREDENTIALS_FILE}`);
    console.log("===============");
    process.exit(0);
  } else {
    console.error("\nCredential update failed!");
    process.exit(1);
  }
}
