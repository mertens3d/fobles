import { exec } from "node:child_process";

export function openInBrowser(filePath: string): void {
  const url = `file://${filePath.replace(/\\/g, "/")}`;
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(command, (error) => {
    if (error) console.warn(`Could not auto-open test report: ${error.message}`);
  });
}

export function printStopSafelyWarning(): void {
  const banner = "=".repeat(70);
  const ansiAmber = "\x1b[43m\x1b[30m";
  const ansiReset = "\x1b[0m";
  console.log(
    `\n${ansiAmber}${banner}${ansiReset}\n${ansiAmber}Stopping this run mid-test leaves the Sitecore session logged in and its${ansiReset}\n${ansiAmber}active-user slot occupied. To stop cleanly, press Ctrl+C ONCE and let it${ansiReset}\n${ansiAmber}finish tearing down (that's what logs the session out) - don't press Ctrl+C${ansiReset}\n${ansiAmber}again or close the terminal, or the session will stay logged in.${ansiReset}\n${ansiAmber}${banner}${ansiReset}\n`,
  );
}
