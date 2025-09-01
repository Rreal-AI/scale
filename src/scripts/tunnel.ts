import "dotenv/config";

import * as ngrok from "@ngrok/ngrok";
import { spawn } from "child_process";

async function startTunnel(port: number, command: string, args: string[]) {
  try {
    // Start ngrok tunnel
    const listener = await ngrok.connect({
      addr: port,
      domain: process.env.NGROK_DOMAIN || undefined,
      authtoken_from_env: true,
    });

    // Set environment variable
    process.env.NEXT_PUBLIC_TUNNEL_URL = listener.url() ?? "";
    console.log(`NEXT_PUBLIC_TUNNEL_URL set to: ${listener.url()}`);

    // Start the application
    const appProcess = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env },
    });

    // Handle process exit
    appProcess.on("exit", () => {
      listener.close();
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const [port, command, ...args] = process.argv.slice(2);

if (!port || !command) {
  console.error("Usage: pnpm run tunnel <port> <command> [args]");
  process.exit(1);
}

startTunnel(parseInt(port), command, args);
