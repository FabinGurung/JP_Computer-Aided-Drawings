#!/usr/bin/env python3
"""Build the stable public code index. Source originals stay at their publishers."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/data/codes/nepal-pokhara.json'
SOURCES=[
 ('NBC105','NBC 105:2025','National seismic design','https://giwmscdnone.gov.np/media/files/NBC_105_2025_Seismic%20Design%20of%20Buildings%20in%20Nepal_lqqvx6a.pdf','9136fd6ca119f3536a4843c02516e791b1098e0275fa4c853c495c684c21ea1e','VERIFIED_PDF','National; use project-specific site evidence'),
 ('NBC205','NBC 205:2024','Ready-to-use low-rise RC detailing','https://giwmscdnone.gov.np/media/pdf_upload/NBC_205_READY-TO-USE_DETAILING_GUIDELINE_FOR-signed.pdf','5285079da891a8b1082540978ef115776ac1f300d1cf26a450e94158280ff8c0','VERIFIED_PDF','Limited prescriptive route, not a universal limit on house size'),
 ('NBC206','NBC 206:2024','Architectural requirements','https://giwmscdnone.gov.np/media/pdf_upload/NBC_206_ARCHITECTURAL_DESIGN_REQUIREMENTS-signed.pdf','8a05ae932cf34394cf082dde0d16abd18044e030c94c89702a305f13fd2e7189','VERIFIED_PDF','Occupancy-specific architectural provisions'),
 ('NBC207','NBC 207:2003','Electrical requirements for public buildings','https://giwmscdnone.gov.np/media/app/public/54/posts/1679824531_73.pdf','e8267e322bdb3a471f14a227afd8aed429044bb65d3b7d534c400d819f2f587b','VERIFIED_PDF','PUBLIC buildings; private-house applicability/adoption must be established'),
 ('NBC208','NBC 208:2003','Sanitary and plumbing requirements','https://giwmscdnone.gov.np/media/app/public/54/posts/1679824552_72.pdf','d39a683b615e6d5dbf497e9fd1671770bae14992b10b00d9c21abfbc2b16a946','VERIFIED_PDF','Water, wastewater and independent storm drainage'),
 ('NBC108','NBC 108:1994','Site consideration for seismic hazards','https://giwmscdnone.gov.np/media/app/public/54/posts/1679824158_65.pdf','23dbebcbcadbad257072c2ed525ca588d8d442d3f3825bc7b4a9def90e9793e7','VERIFIED_PDF','Site investigation; read with current seismic code'),
 ('NBC103','NBC 103:1994','Occupancy loads','https://giwmscdnone.gov.np/media/app/public/54/posts/1679823542_78.pdf','6ce1944caf8a60f3b0612a5a5f3d9938101abeafea8f064cc07577a6ccf96d25','VERIFIED_PDF','Floor-use loads must be assigned explicitly'),
 ('NBC110','NBC 110:1994','Plain and reinforced concrete','https://giwmscdnone.gov.np/media/app/public/54/posts/1679824202_6.pdf','9ba54fce8b680a0a7e9f300f56a6bfe390d1040a987b2de543e3fb5ff5e264ca','VERIFIED_PDF','Read with current seismic ductile detailing requirements'),
 ('UWSSP','UWSSP Design Guidelines v4.0, 2021','Onsite wastewater sizing method','https://giwmscdnone.gov.np/media/pdf_upload/Design%20Guidelines_iwb2hdn.pdf','07a1e3de6648ce9e49eb772c1f0659757605a6febdb5bfc7422f7dd7a45d42ad','VERIFIED_PDF','Government project guideline; local approval remains necessary'),
 ('PKR2083','Pokhara building/infrastructure standards, third amendment 2083','Current municipal amendment notice, posted 2026-10-14','https://pokharamun.gov.np/content/पोखरा-महानगरपालिकाको-भवन-तथा-पूर्वाधार-मापदण्ड-तेस्रो-संशोधन-२०८३pdf',None,'NOTICE_VERIFIED_TEXT_RETRIEVAL_UNAVAILABLE','Notice verified; numeric municipal clauses must not be filled from an older edition'),
 ('NEA','NEA Gandaki distribution regulations and amendments','Supply authority','https://gandaki.nea.org.np/en/category/downloads-3',None,'OFFICIAL_LISTING','Verify sanctioned load, supply, protection and installation testing with the applicable current regulation'),
 ('BYD','BYD Dolphin UK specification, July 2024','Vehicle envelope and turning reference','https://www.byd.com/content/dam/byd-site/uk/pdfs/dolphin/Dolphin-0724-BPS-UK-V6-web.pdf',None,'OFFICIAL_SPECIFICATION','Match the actual market variant; tyre turning radius is not a body swept path')]
rules=[]
def rule(id,source,clause,requirement,value=None,unit=None,scope='APPLICABLE_CONTEXT_REQUIRED'):
 rules.append(dict(id=id,source=source,clause=clause,requirement=requirement,value=value,unit=unit,scope=scope))
rule('NP-205-COVERAGE','NBC205','4.2(g), printed p10','Ready-to-use coverage ceiling',92.90304,'m²','PRESCRIPTIVE_ELIGIBILITY_ONLY')
rule('NP-205-BAY','NBC205','4.2(a), printed p10','Maximum prescriptive bay',4.5,'m','PRESCRIPTIVE_ELIGIBILITY_ONLY')
rule('NP-205-PANEL','NBC205','4.2(a), printed p10','Maximum prescriptive panel area',13.5,'m²','PRESCRIPTIVE_ELIGIBILITY_ONLY')
rule('NP-205-REGULARITY','NBC205','4.2(b-k), printed pp10-11','Regular geometry; vertical columns; uniform foundation level; stated height/bay limits',scope='PRESCRIPTIVE_ELIGIBILITY_ONLY')
rule('NP-105-Z','NBC105','4.1.4; Annex C, Table C-1, row 338','Pokhara seismic zone factor',.35,'dimensionless')
rule('NP-105-SOIL','NBC105','4.1.3, Table 4-2','Soil class from site evidence, not ward name')
rule('NP-STRUCTURAL-DESIGN','NBC105','2.2, 2.3, 3 and foundation requirements','Accepted project analysis, section/detail design and foundation evidence')
rule('NP-206-STAIR-WIDTH','NBC206','2.3/2.4 Table 3, printed p10','General-residence exit width minimum',.9,'m','GENERAL_RESIDENCE_WITH_OCCUPANT_LOAD_CHECK')
rule('NP-206-TREAD','NBC206','2.4.1 Table 4, printed p11','Residential main-stair tread minimum',.25,'m')
rule('NP-206-RISER','NBC206','2.4.1 Table 4, printed p11','Residential main-stair riser maximum',.19,'m')
rule('NP-206-RISERS-FLIGHT','NBC206','2.4.1 Table 4, printed p11','Risers per flight maximum',15,'count')
rule('NP-206-STAIR-HEAD','NBC206','2.4.1 Table 4, printed p11','Main-stair clear headroom minimum',2,'m')
rule('NP-206-HANDRAIL','NBC206','2.4.1 Table 4, printed p11','Handrail above tread centre',.9,'m')
rule('NP-206-ROOM-HEAD','NBC206','3.2.1, printed p12','Habitable room ceiling minimum',2.4,'m')
rule('NP-206-BEAM-HEAD','NBC206','3.2.1, printed p12','Finished clearance below beams/services minimum',2.1,'m')
rule('NP-206-WC-HEAD','NBC206','3.2.1, printed p12','Bathroom/WC height minimum',2,'m')
rule('NP-206-PLINTH','NBC206','3.1, printed p12','Minimum above existing road datum; parking exception',.45,'m')
rule('NP-206-DAYLIGHT','NBC206','3.3, printed p13','Hilly-region habitable natural light area fraction',.1,'room area')
rule('NP-206-KITCHEN-LIGHT','NBC206','3.3, printed p13','Hilly-region kitchen natural light area fraction',.125,'room area')
rule('NP-206-VENTILATION','NBC206','3.3, printed p13','General natural ventilation opening fraction',.0625,'room area')
rule('NP-206-LIGHT-DEPTH','NBC206','3.3, printed p13','Maximum room portion distance from lighting opening',7.5,'m')
rule('NP-206-COMMON-PARK','NBC206','3.6, printed p16','Common parking minimum rectangle',[2.5,4.5],'m','COMMON_PARKING_NOT_AUTOMATIC_PRIVATE_HOUSE_RULE')
rule('NP-206-PARK-HEAD','NBC206','3.6, printed p16','Indoor parking headroom minimum',2.2,'m')
rule('NP-207-SCOPE','NBC207','Title; 1.1/2.2','Public-building scope; supply rules and competent installation required',scope='PUBLIC_BUILDINGS_OR_EXPLICIT_ENGINEER_ADOPTION')
rule('NP-207-CABLES','NBC207','5.10, printed p6','Public-building copper lighting/power cable baseline',[2.5,4],'mm²','PUBLIC_BUILDINGS_NOT_A_COMPLETE_CABLE_DESIGN')
rule('NP-207-PROTECTION','NBC207','4, 6, 7 and 9','Coordinate load, fault rating, voltage drop, earthing and lightning assessment',scope='PUBLIC_BUILDINGS_OR_EXPLICIT_ENGINEER_ADOPTION')
rule('NP-208-WATER-DEMAND','NBC208','A1 Table A1, printed p1','Recommended residence daily water per person',100,'L/person/day')
rule('NP-208-WATER-SEPARATION','NBC208','A2.2.5, printed p4','Underground potable tank separation from wastewater hazards',5,'m')
rule('NP-208-NO-UG-PARK','NBC208','A2.2.5, printed p4','No underground potable tank under car parking')
rule('NP-208-SEPARATE-TRENCH','NBC208','A3.8, printed p7','Separate water/sewer trenches; constrained exception needs 300 mm vertical separation',.3,'m')
rule('NP-208-WATER-TEST','NBC208','A3.10, printed p7','Pressure test: greater of 0.5 MPa or twice working pressure, 30 minutes',[.5,2,30],'MPa/factor/min')
rule('NP-208-SEWAGE-OUTLET','NBC208','B2.1-2.2, printed p27','Approved public sewer connection or authority-approved onsite method')
rule('NP-208-DRAIN-BENCHMARK','NBC208','B2.4.1 Table B14, printed p27','100 mm drain benchmark at 0.75 m/s',[100,57],'mm / 1:n slope')
rule('NP-208-STORM','NBC208','C1-4, printed p32','Keep storm drainage independent from sewage')
rule('NP-UWSSP-SEPTIC','UWSSP','8.4.4, printed pp193-194','Liquid volume = Q×T + 0.0425N + desludging storage; two chambers, 2:1 split')
rule('NP-UWSSP-SOAK','UWSSP','8.4.4, printed pp194-195','Internal diameter = Q/(πHI), bounded 1-3 m; larger requirement needs a different arrangement')
rule('NP-UWSSP-PERCOLATION','UWSSP','8.4.4, printed p195','Measure infiltration and groundwater conditions before soak selection')
rule('PKR-CURRENT-AMENDMENT','PKR2083','Third-amendment notice, 2026-10-14','Current parcel-specific municipal text, zoning and ROW verification')
rule('PKR-PERMIT','PKR2083','Applicable building permission process','Municipal permit reference and issuing authority are required for an acceptance claim')
refs=[
 ('SUSELA KAMI','PBS','https://www.pbsprime.com/product/susela-kami/','Pokhara-14, Masina Tol','Same ward; six-bedroom residence; publisher plot 2476.52 ft²'),
 ('BINA KUMARI RANA','PBS','https://www.pbsprime.com/product/bina-kumari-rana/','Pokhara-26, Pragati Tole','Publisher plot 1656.17 ft²; five bedrooms'),
 ('PARBATI TIMILSINA','PBS','https://www.pbsprime.com/product/parbati-timilsina/','Pokhara-16','Four-bedroom family residence; publisher plot 2931.56 ft²'),
 ('BISHNU MAYA BOHORA','PBS','https://www.pbsprime.com/product/bishnu-maya-bohora/','Pokhara-13, Budhuwa Marga','Four bedrooms; published built area 1303.35 ft²'),
 ('YASOKA RESIDENCE','PBS','https://www.pbsprime.com/product/project-mango/','Pokhara-17, Birauta','Four-bedroom local residence'),
 ('BHUWAN GC','PBS','https://www.pbsprime.com/product/project-peach/','Pokhara-8, Damkal Marga','Three bedrooms; publisher plot 2340.838 ft²'),
 ('SAMJHANA LAMSAL','PBS','https://www.pbsprime.com/product/project-orange/','Pokhara-29, Machhapuchhre Tole','Five-bedroom local residence; published plot 2754.67 ft²'),
 ('CHANDRA KUMAR KHATRI','PBS','https://www.pbsprime.com/product/project-apple/','Pokhara-15, Prativa Marga','Four-bedroom local residence'),
 ('Pokhara-16 residential building','JEC','https://jecpkr.com.np/project/ongoing-residential-building-at-pokhara-16/','Pokhara-16','Local residential construction documentation; area not disclosed'),
 ('Shankar Pahari residence','JEC','https://jecpkr.com.np/project/residential-building-at-lakeside-pokhara/','Lakeside, Pokhara','Local residential project; area not disclosed')]
PROJECT_RETRIEVAL_SHA256={'NP-RES-01': '9592197db2e0a257fadabe227060f4844a152ddeda2e6472be302c105427a0c9', 'NP-RES-02': '41ead80b066039eee1e1293185a15a89f6996818d3a9d7af51bea258e034ed3e', 'NP-RES-03': 'deb0c26cd6613cf0e2c88d93e94387f20485e3502f977ac5418851eacec93521', 'NP-RES-04': '5e7b1a5801949c42fc3cb0cca197c0abda55d0a24efd79b3b14414ffbdc06201', 'NP-RES-05': '19686afa6cb68353d6703d6ecb80240aa5b78e01ebee98ac6627cc20549f6710', 'NP-RES-06': '9d1fa1f8437d731bb00bafd80702a4f7aa5c65df74818bcc7f4d528d9a9c0bc8', 'NP-RES-07': '24aad1bec69c631a2a64a8d7a4ae0bc4e792f0ade0af01a14e0425cb4489e7da', 'NP-RES-08': '960823087492aa29fbc6f6a87bfb1194a10f0eb69915bc787ca2991e3b15e60d', 'NP-RES-09': '311adc4883f9728e7f4d8028f272c0ebdc1a3f184fee241b1034069740108247', 'NP-RES-10': '57cea86ebf7cd043d6072046cbbbccd3cb36c9842587f6cd0b0129a2708f7029'}
data={'schema':'jp-cad://jurisdiction-code-register/1','id':'AAD-NP-PKR-CODES-001','revision':1,'checkedOn':'2026-10-28',
 'jurisdiction':{'country':'Nepal','municipality':'Pokhara Metropolitan City','projectWard':14,'wardSource':'USER_STATEMENT_20261028','parcelVerified':False},
 'textPolicy':'Clause-indexed paraphrases and factual constants. Read complete official PDFs at the source links. This is not an exhaustive transcription or a permit.',
 'sources':[dict(id=a,title=b,subject=c,url=d,sha256=e,retrieval=f,applicability=g) for a,b,c,d,e,f,g in SOURCES],
 'rules':rules,'parameters':{
 'nbc105':{'pokharaZoneFactor':.35,'ordinaryResidentialImportanceFactor':1.0,'soilClassFromWardAllowed':False},
 'nbc205':{'coverageMaxM2':92.90304,'maxBayM':4.5,'maxPanelAreaM2':13.5,'maxStoreyHeightM':3.2,'maxHeightM':12,'maxStoreys':3},
 'nbc206':{'residentialExitWidthMinM':.9,'treadMinM':.25,'riserMaxM':.19,'risersPerFlightMax':15,'stairHeadroomMinM':2,'handrailM':.9,'roomHeightMinM':2.4,'underBeamMinM':2.1,'wcHeightMinM':2,'indoorParkingHeightM':2.2},
 'nbc208':{'residentialLPerPersonDay':100,'undergroundWaterWasteClearanceMinM':5,'sameTrenchExceptionVerticalMinM':.3},
 'uwssp':{'detentionDays':1,'digestionM3PerPerson':.0425,'sludgeStorageM3PerPerson':{'0.5':.0283,'1':.0490,'2':.0708,'3':.0850},'liquidDepthMinM':1,'freeboardRangeM':[.5,1],'lengthWidthRatioRange':[2,4],'compartments':2,'firstToSecondCompartmentRatio':2,'soakMinDiameterM':1,'soakMaxDiameterM':3},
 'vehicle':{'source':'BYD','lengthM':4.29,'bodyWidthM':1.77,'extendedMirrorWidthM':2.012,'heightM':1.57,'wheelbaseM':2.7,'minimumTyreTurningRadiusM':5.25,'bodySweptPathVerified':False}},
 'comparators':[dict(id=f'NP-RES-{i:02}',name=a,publisher=b,url=c,location=d,comparison=e,sourceSha256=PROJECT_RETRIEVAL_SHA256.get(f'NP-RES-{i:02}'),checkedOn='2026-10-28',engineeringTransfer='No published verified soil, footing/rebar schedule, MEP calculation or permit evidence adopted') for i,(a,b,c,d,e) in enumerate(refs,1)],
 'excludedAuthority':{'M08':'Excluded from active design inputs by user instruction; no dependency on missing native bytes. Retained history is not an active design basis.'}}
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('CODE_REGISTER_BUILT',len(rules),'rules;',len(refs),'local residential references')
