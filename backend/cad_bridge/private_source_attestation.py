"""M12.2A — authenticated, read-only *private-runner* source attestation.

This library defines a dependency-injected admission gate; it does NOT supply
Google Drive credentials, a production broker, a DWG converter or a public API.
Only a trusted private deployment may bind these protocols to real providers.
Never expose provider exceptions or source pointers in output/error messages.
"""
from __future__ import annotations

import hashlib
import hmac
import time
from typing import Protocol

from .private_boundary import (
    AuthenticatedCredentialBroker, AuthenticatedSourceResolver,
    PrivateBoundaryError, PrivateSourcePointer, VerifiedPrincipal,
    private_execution_plan,
)


class ProviderVersionVerifier(Protocol):
    """Trusted adapter must consult the provider, not request-supplied JSON."""
    def is_current(self, principal: VerifiedPrincipal,
                   source: PrivateSourcePointer) -> bool: ...


def attest_private_source(*, project_id: str, access_token: str,
                          source: PrivateSourcePointer,
                          broker: AuthenticatedCredentialBroker,
                          resolver: AuthenticatedSourceResolver,
                          versions: ProviderVersionVerifier) -> dict:
    """Inspect one pinned source privately without saving or releasing bytes.

    Source pointer is supplied by an authorized private source catalogue.
    VerifiedPrincipal must come from a trusted broker, not client assertions.
    The adapter must enforce project-scoped authorization on each provider
    read, including every current-version probe.
    """
    if not isinstance(source, PrivateSourcePointer):
        raise PrivateBoundaryError("SOURCE_POINTER_INVALID")
    if not isinstance(project_id, str) or not isinstance(access_token, str) or not access_token:
        raise PrivateBoundaryError("PRIVATE_REQUEST_INVALID")
    # Reuse fail-closed pointer validation; never include the pointer in errors.
    private_execution_plan(project_id, [source])
    if broker is None or resolver is None or versions is None:
        raise PrivateBoundaryError("PRIVATE_ADAPTER_NOT_CONFIGURED")
    try:
        principal = broker.verify_principal(access_token)
    except Exception:
        raise PrivateBoundaryError("IDENTITY_NOT_VERIFIED") from None
    if (not isinstance(principal, VerifiedPrincipal)
            or not principal.subject_id or not principal.issuer
            or not principal.audience or type(principal.expires_epoch) is not int
            or principal.expires_epoch <= int(time.time())):
        raise PrivateBoundaryError("IDENTITY_NOT_VERIFIED")
    try:
        authorized = broker.authorize_project(principal, project_id)
    except Exception:
        raise PrivateBoundaryError("PROJECT_ACCESS_DENIED") from None
    if authorized is not True:
        raise PrivateBoundaryError("PROJECT_ACCESS_DENIED")
    try:
        before = versions.is_current(principal, source)
    except Exception:
        raise PrivateBoundaryError("SOURCE_REVISION_NOT_VERIFIED") from None
    if before is not True:
        raise PrivateBoundaryError("SOURCE_REVISION_NOT_VERIFIED")
    try:
        data = resolver.resolve_bytes(principal, source)
    except Exception:
        raise PrivateBoundaryError("SOURCE_READ_DENIED") from None
    if not isinstance(data, bytes) or not (0 < len(data) <= 64_000_000):
        raise PrivateBoundaryError("SOURCE_BYTES_OUT_OF_POLICY")
    digest = hashlib.sha256(data).hexdigest()
    if not hmac.compare_digest(digest, source.sha256):
        raise PrivateBoundaryError("SOURCE_DIGEST_MISMATCH")
    try:
        after = versions.is_current(principal, source)
    except Exception:
        raise PrivateBoundaryError("SOURCE_REVISION_NOT_VERIFIED") from None
    if after is not True:
        raise PrivateBoundaryError("SOURCE_REVISION_CHANGED_DURING_READ")
    # Deliberately no bytes, locator, revision ID, token or project ID.
    # The result is only a *private* stage gate, not a conversion receipt.
    return {
        "schema": "fabin-cad://private-source-attestation/0.1",
        "status": "SOURCE_BYTES_ATTESTED_PRIVATE_ONLY",
        "provider_identity_verified": True,
        "project_access_verified": True,
        "revision_current_before_and_after_read": True,
        "pinned_source_sha256_matched": True,
        "conversion_provenance_verified": False,
        "coordinate_system_verified": False,
        "dxf_parity_verified": False,
        "engineering_approval": "HOLD",
        "quantity_takeoff": "BLOCKED",
        "construction_release": "BLOCKED",
        "public_publication": False,
        "private_design_execution_enabled": False,
    }
