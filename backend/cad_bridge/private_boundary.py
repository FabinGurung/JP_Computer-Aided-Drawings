"""M09.2 private CAD source boundary.

This public repository has no credential broker, private runner or private
source resolver. Source pointers below are redacted in any returned plan.
A private deployment must supply a real verified principal, project ACL
service, short-lived credentials, immutable provider version checks, encrypted
output store and audit receipts before enabling the capability.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Protocol, Sequence


class PrivateBoundaryError(ValueError):
    """Error code only: never include provider IDs or secret locators."""


@dataclass(frozen=True)
class VerifiedPrincipal:
    """Provider-attested identity; never construct from self-asserted JSON."""
    subject_id: str
    issuer: str
    audience: str
    expires_epoch: int


@dataclass(frozen=True)
class PrivateSourcePointer:
    source_id: str
    provider: str
    opaque_locator: str
    version_id: str
    sha256: str


class AuthenticatedCredentialBroker(Protocol):
    def verify_principal(self, access_token: str) -> VerifiedPrincipal: ...
    def authorize_project(self, principal: VerifiedPrincipal, project_id: str) -> bool: ...


class AuthenticatedSourceResolver(Protocol):
    def resolve_bytes(self, principal: VerifiedPrincipal, source: PrivateSourcePointer) -> bytes: ...


class ImmutableArtifactStore(Protocol):
    def put_encrypted(self, principal: VerifiedPrincipal, project_id: str, payload: bytes) -> str: ...


def private_execution_plan(project_id: str, sources: Sequence[PrivateSourcePointer]):
    """Return only a safe architectural plan; never expose opaque locators."""
    if not project_id or not sources:
        raise PrivateBoundaryError("PRIVATE_PLAN_INVALID")
    if len(sources) > 32 or len({x.source_id for x in sources}) != len(sources):
        raise PrivateBoundaryError("PRIVATE_SOURCE_IDENTITY_INVALID")
    if any(not x.source_id or not x.provider or not x.opaque_locator or
           not x.version_id or len(x.sha256) != 64 or
           not all(c in "0123456789abcdef" for c in x.sha256)
           for x in sources):
        raise PrivateBoundaryError("PRIVATE_SOURCE_IDENTITY_INVALID")
    return {
        "schema": "fabin-cad://private-resolution-plan/0.2",
        "project_id": project_id,
        "source_ids": sorted(x.source_id for x in sources),
        "status": "BLOCKED_PRIVATE_RUNNER_NOT_CONFIGURED",
        "requires": [
            "PROVIDER_VERIFIED_IDENTITY", "PROJECT_ACL",
            "SHORT_LIVED_AUTHORITY", "IMMUTABLE_SOURCE_VERSION_AND_SHA256",
            "ENCRYPTED_PRIVATE_ARTIFACT_STORE", "AUDIT_RECEIPT",
            "INDEPENDENT_ENGINEERING_APPROVAL"
        ],
        "can_fetch": False,
        "can_execute": False,
        "can_publish": False,
    }


def dispatch_private_design(*_args, **_kwargs):
    """Deliberately non-overridable fail-closed public entrypoint."""
    raise PrivateBoundaryError("PRIVATE_RUNNER_NOT_CONFIGURED")
