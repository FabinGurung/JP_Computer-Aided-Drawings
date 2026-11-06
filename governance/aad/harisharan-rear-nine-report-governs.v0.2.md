# Harisharan rear nine — governing report reconciliation v0.2

## Table of contents
- 1. Source priority
  - 1.1 User-highlighted structural plan
    - 1.1.1 Nine report member IDs
- 2. Report precedence
  - 2.1 Source-backed material and beam schedules
    - 2.1.1 M25, Fe500, tie/plinth and strap beam specifications
- 3. Quantity corrections
  - 3.1 Preserved model and draft
    - 3.1.1 Fifteen report-governed link counts, residual HOLDs
- 4. Site release
  - 4.1 Procurement safety
    - 4.1.1 Unaccepted fabrication details

## 1. Source priority
### 1.1 User-highlighted structural plan
#### 1.1.1 Nine report member IDs
User image circles the **upper 3×3 portion of the tie-beam plan**, plan grid rows 6, 5, 4. This identifies the intended group. Structural analysis report column schedule and original CAD model register the rightmost physical member as **E4 on row 4, D5 on row 5, C6 on row 6**; they are not additional columns. Unique IDs:
- Row 6: A6, B6, C6
- Row 5: A5, B5, D5
- Row 4: A4, B4, E4

Thus the correct scoped 9 original model IDs have **not** been changed; the selected physical group is now user-confirmed. Geographic bearing or a surveyed north datum is not inferred from a screen position.

## 2. Report precedence
### 2.1 Source-backed material and beam schedules
#### 2.1.1 M25, Fe500, tie/plinth and strap beam specifications
User selected **HAR-SRC-RPT-001**, the `Structural Report revised - Harisaran Adhikari for torsion.docx`, SHA-256 `8aa9e0a67817c3d00382f910d3b293cdf172dbda7bda3ea4144308fee4942b35`, as the governing design reference when it differs from the September structural drawing.

| Element | Governing report summary |
|---|---|
| Concrete / reinforcing steel | M25 / Fe500 |
| Column section | 450 × 450 mm (member-specific vertical schedule retained) |
| Tie (plinth) beam | 300 × 350 mm, 2Ø20 + 1Ø16 top and bottom; Ø8 links at 125 mm **throughout** |
| Strap beam | 450 × 800 mm; 8Ø20 top, 4Ø20 bottom; four-legged Ø8 at 100 mm **throughout** |
| Footing F1 | 2550 × 2550 × 600 mm, applicable to B4, B5, B6 |
| Footing F2 | 2700 × 2100 × 600 mm, applicable to six outer nodes |
| Footing mesh | Ø16 at 150 mm each direction. The **number of mat layers is not explicit** in this summary; remains HOLD |

The prior structural PDF/source scenario is retained as comparison evidence. M25 selection does **not** supply an accepted batching mix or fix geotechnical, seismic or signed design-release problems.

## 3. Quantity corrections
### 3.1 Preserved model and draft
#### 3.1.1 Fifteen report-governed link counts, residual HOLDs
For each of 15 selected tie/plinth spans, link count now uses `ceil((source_centerline_m - column_size_m)/0.125)+1`. The original STR-05 100 mm at ends / 150 mm mid count survives as `sourceCount`; any user-proposed count remains a local draft override. The original 18-column model, rods and source takeoff revision R000001 remain immutable.

Native Google Sheet **HAR-REAR9-R000002** was updated in-place with the same provider file ID after duplicating and reading back R000001 in the governed Engineering Record Archive. Report-scoped theoretical steel subtotal changed from **5,849.57 kg** to **5,864.69 kg**; this difference reflects the 15 tie-beam link rows, *not* a signed procurement BBS. There are still 9 pads, 6 internal straps, 12 internal tie/plinth spans and 3 outer boundary spans.

The browser editor uses draft schema v2, bound to the structural report source fingerprint. Any former browser-only v1 draft stays in its separate local-storage key and is not silently imported under the new governing basis.

## 4. Site release
### 4.1 Procurement safety
#### 4.1.1 Unaccepted fabrication details
Engineering HOLDs remain: footing top/bottom layers, exact stirrup/hoop shapes and bar cutting lengths, column Ø8/Ø10 tie conflict, bar laps/anchorage, stocks/cutting waste, confirmed survey geometry, soil and code discrepancies, signed source approval, concrete mix approval and tests. The previous 5.85 t / 107-bundle illustration was a procurement *estimate*, and this update does not authorize a purchase or steel cutting. Original reports and PDFs remain restricted in Drive.
