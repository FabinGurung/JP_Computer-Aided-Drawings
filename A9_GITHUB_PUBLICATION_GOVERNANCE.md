# A9 ↔ GitHub Publication Governance

GitHub is the publication/version-control layer. It does not replace A9/Google Drive as project or engineering authority.

## Required publication record

For each project web publication, record:

1. A9 project/event or governed source lineage.
2. Repository and branch.
3. Parent/base commit SHA.
4. New commit SHA and tree SHA.
5. Pull request number/URL and merge state.
6. Public-safety/provider readback result.
7. Tag and GitHub Release, when available.
8. Deployment provider, deployment identifier/URL and provider readback.
9. Rollback commit/tag.
10. Remaining gates / incomplete work.

## Typed lineage

Recommended A9 relations:

- `PUBLISHED_AS`
- `COMMIT_FOR`
- `PR_FOR`
- `TAG_FOR`
- `RELEASE_FOR`
- `DEPLOYS`
- `SUPERSEDES`
- `ROLLBACK_TO`

## Public-safety rule

No private Drive ID, private Drive URL, internal register/checkpoint link, unapproved client/contact information, or non-public source binary may be placed in the public repository merely because it is convenient to navigate. Stable Docs/Sheets can be linked once their intended audience and access classification explicitly permit publication.

## Release gate

A branch or commit is not a release. A tag is not a deployment. A deployment is not engineering approval. Close an A9 publication sequence only after the exact evidence appropriate to the claimed state has been provider-read back.
