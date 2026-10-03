import readline from "node:readline/promises";

const QUIT_LABEL = "Quit";

// Shared by sitecore-cli-login.js/sitecore-cli-pull.js/sitecore-cli-push.js/secure-secret-store.js
// so none of them hand-rolls its own readline menu - callers pass their own `message` since this
// is used for two unrelated things (which Sitecore CLI login target vs. which secret name), not
// just CLI targets. `entries` is `{ suffix, label }[]`; `allowAll` adds an "All" choice returning
// null. A trailing "Quit" choice is always added - selecting it (or Ctrl+C at any point) exits the
// process cleanly rather than returning control to the caller.
export async function promptForSuffix(entries, { allowAll = false, message = "Which one?" } = {}) {
  console.log(`\n${message}`);
  entries.forEach((entry, index) => console.log(`  ${index + 1}) ${entry.label}`));
  if (allowAll) console.log(`  ${entries.length + 1}) All`);
  const quitNumber = entries.length + (allowAll ? 2 : 1);
  console.log(`  ${quitNumber}) ${QUIT_LABEL}`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question("Enter a number: ")).trim();
    const choice = Number(answer);
    if (choice === quitNumber) {
      console.log("Cancelled.");
      process.exit(0);
    }
    if (allowAll && choice === entries.length + 1) return null;

    const selected = entries[choice - 1];
    if (!selected) throw new Error(`Invalid selection: "${answer}"`);
    return selected.suffix;
  } catch (error) {
    // readline/promises rejects the pending question() with this on Ctrl+C - exit quietly
    // instead of dumping a stack trace for what's just a normal "never mind" cancellation.
    if (error?.name === "AbortError") {
      console.log("\nCancelled.");
      process.exit(130);
    }
    throw error;
  } finally {
    rl.close();
  }
}
