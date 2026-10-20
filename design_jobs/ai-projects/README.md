# AI-authored AAD project specifications

Add **one versioned `.json` design specification per approved public project** (format: `jp-cad://aad-ai-design/1`). ChatGPT or another authorized AI generates this from the user's natural-language instruction and evidence.

The shared [AI-to-AAD contract](../../cad/aad/AI_TO_AAD_PIPELINE_V1.md) documents inputs, public approval and the non-engineering-construction boundary. Every `*.json` here is compiled automatically by `tools/site/aad-ai-build-all.mjs` during GitHub PR and Pages workflows. No project's AAD engine code should be copied or forked.

For **private or unapproved client drawings**, do not add a spec here: GitHub Pages is public. Keep engineering and source evidence governed in the authorized private system and obtain explicit public publication permission.

Never edit the v0.6.0 release tag; develop project files on a branch. Each spec must use a new unique slug, since compilation refuses to overwrite a different published project artifact.
