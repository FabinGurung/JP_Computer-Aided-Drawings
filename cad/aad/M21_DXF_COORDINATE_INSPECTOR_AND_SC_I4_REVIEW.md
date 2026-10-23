# AAD M21 — Interactive source-coordinate inspection (GF DXF review)

This update affects the reusable common source-review template, not the original architectural/structural DXFs, original Narayani source ledger, or older Narayani multistorey BIM. Engineering HOLD remains.

## Picking in both views

- **2D:** mouse hover shows world **X/Z in metres** calculated using the actual SVG `getScreenCTM()` inverse, so resizing and responsive scaling are respected. Click or touch the image to pin a measured *cursor location*. The pin is red and visually distinct from original source column centres.
- **3D:** hover shows world X/Z from the camera ray intersection with the **ground-floor Y=0 horizontal plane**, not the height of a schematic beam mesh. Clicking or tapping pins the ground-plane projection. This is a coordinate pick, not a physical beam intersection or verified structural point.
- **Pin/copy:** a persistent red crosshair appears in plan and on the 3D ground plane. The inspector shows world coordinates, inverse-registered structural DXF millimetres, nearby source column/beam candidates and their proximity, plus difference to source SC-I4 when present. A selectable text area works even if clipboard permission is blocked.

## SC-I4 and beam source distinction

The **original DXF-derived SC-I4** centre is world X 21.000162, Z 5.470040 m.
- Source extracted candidate SB-GF-018 terminates **0.131909 m** before the projected crossing with SB-GF-020's extended line.
- SB-GF-020 likewise terminates **0.131909 m** before the projected crossing.
- The **extended** candidate centrelines meet at world X **21.000162**, Z **6.125040** m, **0.655 m** from SC-I4.

The shared UI offers two reusable beam selectors with an optional projected crossing marker. When lines are nearly parallel or extensions exceed the review threshold, the button cannot propose an intersection. The suggested point is a **review hypothesis only**—neither a CAD node nor structural design approval. The model and original source ledger are immutable in the hover/pin workflow.

## QA / user review

Source geometry smoke asserts the actual 0.131909 m endpoint gaps, the 0.655 m candidate-vs-original difference, reverse native-mm registration and unchanged SC-I4. Browser QA verifies screen-to-SVG cursor mapping, 3D Y=0 raycast HUD, desktop clicks, mobile touch pinning, copyable text and preservation of the 2D/3D/table source-ID parity.

This release improves **inspection** only. Do not amend the DXF-sourced SC-I4 location or merge beam candidates as actual structural members without source-evidence review, documented drawing conflict resolution, and a later separately approved revision.
