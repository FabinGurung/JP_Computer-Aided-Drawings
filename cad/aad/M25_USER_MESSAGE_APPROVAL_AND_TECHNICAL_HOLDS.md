# M25 — User chat approval and engineering verification separation

**Date:** 2026-10-24 · **Timezone:** Asia/Kathmandu · **Project:** PRJ-000007 / 15_Narayani_Parajuli

The user supplied this explicit chat statement immediately after the published M24 review:

> i approve vervally or message-ly just now.

This is a valid recorded expression of the user's **project/workflow approval** of the M24 source-review working interpretation. A second user signature or file upload is not required merely to record what the user wants.

**Source of record:** `public/data/projects/narayani-parajuli/aad-user-message-approval-20261024.json` is an additive approval event. Original QA decisions remain in `aad-user-qa-decisions-v1.json` and are not overwritten.

**Working proposal authorized by the user:** DXF-preferred 23-column presentation, with original DXF I4 hidden from working interpretation and an explicit proposed Ø350 mm I3 column displayed; 21 original DXF footing outlines (including G1 1.80 m square), 16 M70 GF/plinth beam runs, comparison of historical M60/M40/V03 frozen stages. This authorizes continued modeling, review, discrepancy resolution and AI-assisted development.

**What the message does not prove:** engineer-performed calculations of I3 footing and vertical load path, final CF1 support solution for the original SC-I4 reference, reconciled G1 concrete design/rebar and excavation clearance, or independent verification of a professional structural sign-off. The user may be professionally qualified; that is neither established nor denied by this chat message. `ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION` remains for those physical design issues, not for missing user permission.

**Software behavior:** The source-review engine reads the add-only message event if the project-specific optional QA adapter is requested. Displays `USER_MESSAGE_APPROVAL_RECORDED` as an authorization/ledger status while retaining the geometry HOLD. No structural-source DXF, frozen data, material quantities, IFC, BIM, or construction drawing changes are made.

**Expected QA:** verify exact message, immutable input sources, path/schema/project identity, `engineeringApprovalVerified=false`, `constructionApproval=false`, and failing unsafe attempts to escalate the chat message into engineering certification. Existing M24 source and browser smoke must still pass.
