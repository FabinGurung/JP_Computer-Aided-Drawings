# M17 — Informal-input acceptance, component source trace and linked coordinate verification

## Goal and trust boundaries

AI-assisted AAD does **not** require an external CAD file. User intent may arrive through a chat prompt, dictation/voice transcript, hand sketch/photo, PDF, DXF, DWG, SKP or author-authored design notes.

- The new `prepareAADDesignBrief({channel,text,reference?})` is a deterministic **text-description intake helper**. It does not perform OCR, speech-to-text, image recognition, zoning interpretation or actual room placement. ChatGPT or another authorized interpreter converts a sketch/audio input into a faithful textual description first. No model is hosted on GitHub Pages.
- Acceptable `channel`: `natural-language`, `voice-transcript`, `hand-sketch`, `dwg`, `dxf`, `skp`, `image`, `pdf`, `drawing`. The output uses `jp-cad://aad-design-brief/1` and is **not** the published AAD design schema.
- The helper extracts clearly expressed plot dimensions (metric or imperial), some occupant/storey/bedroom intent and location when explicitly given; it records unresolved access, setbacks, orientation and building-services issues. Its programme is only an AI review suggestion.
- **No public publication from intake alone.** The downstream AI prepares exact, locally coordinated `jp-cad://aad-ai-design/1` geometry with owner approval, or works privately. A source link must not be confused with proof that measurements were independently authenticated.

### Demonstration of an informal request

User text: *"I want a residential layout for a family of 5 on a 20' by 40' site in Pokhara, Nepal."*

Extracted site: **6.096 × 12.192 m = 74.322 m²** (source: user-reported feet; no survey). A possible review programme is three bedrooms, living, kitchen, dining, bathrooms and utility. The compiler **must not** automatically place these spaces without road-side orientation, applicable sourced setbacks, target storey count, usable interior dimensions, access/daylight and owner review. The programme is not a substitute for NBC/municipal checks.

Illustrative Node command:

```sh
node --input-type=module -e 'import {prepareAADDesignBrief} from "./public/assets/js/aad-design-brief.mjs";console.log(JSON.stringify(prepareAADDesignBrief({channel:"natural-language",text:"Family of 5, 20 ft by 40 ft plot in Pokhara"}),null,2))'
```

Hand sketches should include their observed labels, uncertainty and photograph reference **in the AI intake step**; voice input should be represented as a transcript with uncertain numbers explicitly reviewed, not falsely treated as measured DXF.

## Element-level trace

An owner-approved public design requires an explicit provenance basis for every storey. For finer-grained traceability:
- `level.exteriorWallProvenance.EXT-01`: optional **specific exterior wall** source evidence.
- `level.partitions[].provenance`: optional partition/segment evidence.
- `level.openings[].provenance`: optional individual door/window evidence.
- `spec.structural.componentProvenance`: optional `columns`, `beams`, `slabs`, `roof`, `stairs`, `landing` evidence grouped by conceptual component family.

Acceptable evidence bases: `source-referenced` with a catalogued `sourceId` and `locator`; `ai-inferred` with a rationale; `synthetic` in test projects only. Missing individual evidence inherits the floor provenance with `scope: inherited-storey`; structural groups default to an explicit AI-assumption provenance, **never a false source-measured claim**.

Published `aad-ai-qa.json` records a `componentProvenance` trace for actual assembled IFC-typed objects. The 3D model/element schedule carries the same `provenance` field. IFC4 class assignment alone does not provide a certified provenance property set or structural design approval.

The `sources` catalogue can reference drawing, image, sketch, voice transcript, natural-language request or several CAD file kinds. A reference is unverified author metadata; **do not paste private Drive links into publicly published design specifications**.

## Optional spatial review checks

The existing `constraints.buildableEnvelope` checks polygon containment. M17 also permits:
- `constraints.site.bounds`: a **rectangle in building-world XZ metres** expressed by `minX,maxX,minZ,maxZ`.
- `constraints.site.setbacks`: distances in metres keyed by the same four XZ sides (not arbitrarily named north/front/rear).
- `constraints.site.provenance`: optional cited or AI-inferred basis for the input site/setbacks.
- `constraints.maxSiteCoverageRatio`: 0–1 area fraction of the **ground-floor model polygon** over the explicitly supplied rectangular plot.
- `constraints.minRoomFaceAreaM2`, `minRoomFaceBBoxSpanM`, `minDoorsPerBoundedRoom`: optional checks against topologically enclosed wall graph regions and hosted doors.

These are **input constraints**, not setbacks calculated from Pokhara municipal law. The bounding span is not a measured clear room width; a wall-hosted door is not a code-compliant escape route or accessibility check. Do not derive municipal requirements from these names.

## Column and coordinate audit

The source floor graph uses local plan X/Z coordinates. The manifest's `level.transform` translates/rotates a floor into the building **world X/Z** frame; elevation is **world Y**. The structural column grid `gridX/gridZ` is explicitly `WORLD_XZ_METRES`, not floor-local. A 3D `IfcColumn` assembly object at world `(X,Y,Z)` is used unchanged to create its THREE mesh and component table. The new 2D plan draws the **actual column rectangular footprint** at `x ± dx/2` and `z ± dz/2` for each storey. The plan no longer substitutes a point-only locator for a column.

A stable read-only `window.AADStudio.getViewCoordinateProof(elementId)` exposes the assembled element's center, the actual Three.js mesh location, 2D column footprint center and table coordinates for acceptance tests. Both the synthetic two-storey example and the existing Narayani three-storey project are exercised. 2D room labels now apply the floor rotation too; the previous translation-only centroid display was inconsistent for rotated storeys.

**Limitations:** The BIM model is a conceptual assembly; 2D beam/slab footprints and structural-member editing remain further work. The 2D plan, 3D and table now use the same source model for column coordinates, but that alone does not validate column layout against architectural clearances or structural design.

## Release scope

No client-specific content, frozen v0.6.0 tag, Vercel project or `narayani-pages-v0.2` branch should be changed. Run the standard AAD linked-room, browser, independent IFC parser, Pages deployment and live readback before claiming publication.
