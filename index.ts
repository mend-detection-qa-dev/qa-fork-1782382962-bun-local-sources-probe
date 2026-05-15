// Probe stub — not meant to be executed.
// Exists solely to satisfy the project-creator output spec and
// give Mend's scanner a TypeScript entry-point to anchor detection.
//
// Patterns under test:
//   local-file-dep  — "my-utils" referenced via "file:./vendor/my-utils"
//                     Bun COPIES the package into node_modules (no symlink).
//                     Expected Mend output: source="local", editable=false (or absent).
//
//   local-link-dep  — "my-helpers" referenced via "link:./vendor/my-helpers"
//                     Bun SYMLINKS the package into node_modules (editable in-place).
//                     Expected Mend output: source="local", editable=true.
//
// The distinction between file: and link: is the editable flag — the only
// differentiator once both are classified as source="local".

export function greet(name: string): string {
  // Stub import comment — real imports would pull from the vendor packages.
  // import { format } from "my-utils";
  // import { capitalize } from "my-helpers";
  return `Hello, ${name}!`;
}
