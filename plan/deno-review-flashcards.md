# Deno Configuration Review Flashcards

## Flashcard 1
**Q:** What VS Code setting allows you to enable Deno only for specific directories (like Supabase functions) while keeping it disabled for the main workspace?
?
**A:** Use `"deno.enablePaths"` in `.vscode/settings.json` with `"deno.enable": true` and specify an array of paths like `["supabase/functions"]`. This enables Deno selectively instead of globally.

---

## Flashcard 2  
**Q:** What do the glob pattern symbols `*` and `**` mean, and why might `"supabase/functions/**/*"` not work as expected in `deno.enablePaths`?
?
**A:** `*` matches any characters within a single directory level, while `**` matches across multiple directory levels recursively. The pattern might not work because: 1) The Deno extension may expect specific formats, 2) Sometimes simpler paths like `"supabase/functions"` work better than complex globs, or 3) The extension might have bugs with certain glob patterns. 