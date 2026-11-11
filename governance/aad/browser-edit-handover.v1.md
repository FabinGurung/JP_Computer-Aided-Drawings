# AAD Browser Edit History → reviewed GitHub publication

**System contract v1 · 11 November 2026 · public-safe documentation**

This extends the **existing** unified 2D/3D AAD editor, rather than creating another source registry, engineering authority or backend. It is a user-initiated **local-only** authoring and handover workflow.

## Use it

1. Open the [Design Studio](../../cad/aad/index.html) synthetic sample or an actual project AAD workspace. Choose the relevant floor.
2. The **Edit draft: ON** button allows local work. Switch to **View only** when merely inspecting; it disables authoring controls and direct semantic/topology edits. Editing remains the default for compatibility with existing project toolchains.
3. Select a working wall, door or window in 2D, 3D or the component table, edit its parameters, or choose **Delete selected draft item**. Only eligible interior connected walls and hosted openings can be removed. Exterior walls, source-backed structural members and supports are not universally deletable. Remove a hosted opening first before removing its host interior wall.
4. **Edit History** records successful additions, removals, parameter edits, undo, reset-to-source and draft imports. Rejected edits are not logged as successful. Existing unlogged browser drafts are marked **recovered-untracked-draft**, not falsely represented as full historical operations.
5. Choose **Copy edit log for ChatGPT** or **Download change-set JSON**. This button does not send anything to a remote service.
6. Paste or attach the change set in the matching project chat, with the instruction: "Review this AAD change set against the current authoritative model and Drive sources, replay its object operations, show differences, preserve engineering HOLDs, then open a scoped GitHub PR and verify Actions and Pages."
7. The receiving assistant must inspect current source revision, project identity, original Drive ownership and A7 records before any edit. After a successful replay, run model/IFC QA, preserve PRE/POST where applicable, and use a reviewed versioned PR. A successful browser edit is not professional engineering acceptance.

## Change-set contract

Schema: **jp-cad://aad-edit-change-set/1**.

Export fields: projectId, baselineRevision, sourceManifestPath, baselineFingerprint, finalFingerprint, approval, sourceStatus and sequential events. Each accepted event has an ID, ISO timestamp, action kind, floor and object identity where available, a descriptive message, pre/post model fingerprints and RFC 6902 JSON Patch operations.

Patch paths are limited to the editable floorGraph of the project models. Replay rejects unsupported operations, invalid paths, changed project IDs, revision mismatches, stale baselines and incorrect before/after fingerprints. Each replace or remove operation carries a JSON Patch test condition. The existing AAD engine independently validates geometric integrity and assembly/IFC invariants when accepting any subsequent reviewed change.

The FNV-1a64 fingerprint is a **non-cryptographic accidental divergence check**, not source authentication. A reviewer must separately verify provider evidence, real file hashes and the exact current Git commit SHA.

A previously existing local draft without individual journal entries becomes one flagged recovery diff; the original sequence cannot be recovered. If an old journal diverges from the local draft, the old raw record is archived separately in browser storage.

## Boundaries

- Browser storage is local to the device/browser and can be erased. Export your JSON file.
- This is a static GitHub Pages site; no repository token or automatic source write is available.
- A deletion changes the **working draft only**. Authoritative source drawings, approved quantities, source-backed structure and historical releases are unchanged.
- Existing single-step Undo is supported and journalled; this is not a collaborative live-sync editor.
- Derived 3D items not represented by editable graph walls/openings deliberately have no generic delete action in this release.
- No independent engineering HOLD is closed by the history, local edits or Pages publication.

## References

- tldraw [selection and deletion](https://tldraw.dev/sdk-features/editor), plus [undo/redo and history](https://tldraw.dev/sdk-features/history).
- [RFC 6902 JSON Patch](https://www.rfc-editor.org/rfc/rfc6902.html).
- [GitHub pull request review](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request).

The A7/A9 workflow combines established techniques: human browser edits → machine-readable journal → ChatGPT review → controlled GitHub PR → QA → live publication.
