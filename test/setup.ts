import { installGlobals } from "@remix-run/node";

// Remix's json() builds a web Response; installGlobals matches what the
// server entry does at boot.
installGlobals();

process.env.MONDAY_API_KEY ||= "test-monday-key";
