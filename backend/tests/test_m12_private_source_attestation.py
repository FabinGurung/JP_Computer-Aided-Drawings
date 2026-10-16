"""M12.2A synthetic private-adapter tests — never access real client files."""
from __future__ import annotations

import hashlib
import json
import time
import unittest

from backend.cad_bridge.private_boundary import (
    PrivateBoundaryError, PrivateSourcePointer, VerifiedPrincipal,
    dispatch_private_design,
)
from backend.cad_bridge.private_source_attestation import attest_private_source


class Broker:
    def __init__(self):
        self.acl = True
        self.identity = VerifiedPrincipal("trusted-subject", "trusted-issuer",
                                          "private-audience", int(time.time()) + 3600)
    def verify_principal(self, access_token):
        if access_token != "synthetic-token":
            raise RuntimeError("PRIVATE_BROKER_EXCEPTION:SECRET")
        return self.identity
    def authorize_project(self, principal, project_id):
        return self.acl


class Versions:
    def __init__(self):
        self.responses = [True, True]
        self.calls = 0
    def is_current(self, principal, source):
        answer = self.responses[min(self.calls, len(self.responses)-1)]
        self.calls += 1
        return answer


class Resolver:
    def __init__(self, raw):
        self.raw = raw
    def resolve_bytes(self, principal, source):
        return self.raw


class AttestationTests(unittest.TestCase):
    def setUp(self):
        self.secret = "gdrive://NOT-A-REAL-PROVIDER-PRIVATE-LOCATOR"
        self.raw = b"SYNTHETIC PRIVATE ATTACHMENT TEST BYTES ONLY"
        self.pointer = PrivateSourcePointer(
            source_id="SYNTHETIC_001", provider="GOOGLE_DRIVE",
            opaque_locator=self.secret, version_id="SYNTHETIC_V1",
            sha256=hashlib.sha256(self.raw).hexdigest())
        self.broker = Broker()
        self.resolver = Resolver(self.raw)
        self.versions = Versions()

    def run_gate(self, **changes):
        args = dict(project_id="DEMO-CAD", access_token="synthetic-token",
                    source=self.pointer, broker=self.broker,
                    resolver=self.resolver, versions=self.versions)
        args.update(changes)
        return attest_private_source(**args)

    def test_pinned_byte_attestation_is_not_design_or_publication(self):
        report = self.run_gate()
        self.assertEqual(report["status"], "SOURCE_BYTES_ATTESTED_PRIVATE_ONLY")
        self.assertTrue(report["pinned_source_sha256_matched"])
        self.assertEqual(self.versions.calls, 2)
        self.assertEqual(report["engineering_approval"], "HOLD")
        self.assertEqual(report["quantity_takeoff"], "BLOCKED")
        self.assertEqual(report["construction_release"], "BLOCKED")
        self.assertFalse(report["dxf_parity_verified"])
        self.assertFalse(report["private_design_execution_enabled"])
        self.assertFalse(report["public_publication"])
        serialized = json.dumps(report)
        for private in (self.secret, "SYNTHETIC_V1", "synthetic-token",
                        "DEMO-CAD", self.pointer.sha256):
            self.assertNotIn(private, serialized)

    def test_fail_closed_auth_acl_expiry_and_provider_error_redaction(self):
        failures = [
            ({"access_token": "bad-token"}, "IDENTITY_NOT_VERIFIED"),
            ({"access_token": ""}, "PRIVATE_REQUEST_INVALID"),
            ({"source": {"self_asserted": True}}, "SOURCE_POINTER_INVALID"),
            ({"broker": None}, "PRIVATE_ADAPTER_NOT_CONFIGURED"),
        ]
        for overrides, reason in failures:
            with self.subTest(reason=reason), self.assertRaises(PrivateBoundaryError) as caught:
                self.run_gate(**overrides)
            self.assertEqual(str(caught.exception), reason)
            self.assertNotIn("SECRET", str(caught.exception))
        self.broker.acl = False
        with self.assertRaisesRegex(PrivateBoundaryError, "PROJECT_ACCESS_DENIED"):
            self.run_gate()
        self.broker.acl = True
        self.broker.identity = VerifiedPrincipal("trusted-subject", "issuer", "audience",
                                                  int(time.time()) - 100)
        with self.assertRaisesRegex(PrivateBoundaryError, "IDENTITY_NOT_VERIFIED"):
            self.run_gate()

    def test_hash_size_and_revision_race(self):
        self.resolver.raw = b"tampered data"
        with self.assertRaisesRegex(PrivateBoundaryError, "SOURCE_DIGEST_MISMATCH"):
            self.run_gate()
        self.resolver.raw = b""
        with self.assertRaisesRegex(PrivateBoundaryError, "SOURCE_BYTES_OUT_OF_POLICY"):
            self.run_gate()
        self.resolver.raw = self.raw
        self.versions = Versions()
        self.versions.responses = [True, False]
        with self.assertRaisesRegex(PrivateBoundaryError, "SOURCE_REVISION_CHANGED_DURING_READ"):
            self.run_gate()
        self.assertEqual(self.versions.calls, 2)
        self.versions = Versions()
        self.versions.responses = [False]
        with self.assertRaisesRegex(PrivateBoundaryError, "SOURCE_REVISION_NOT_VERIFIED"):
            self.run_gate()
        self.assertEqual(self.versions.calls, 1)

    def test_public_runner_still_disabled(self):
        with self.assertRaisesRegex(PrivateBoundaryError, "PRIVATE_RUNNER_NOT_CONFIGURED"):
            dispatch_private_design(project_id="DEMO-CAD", source=self.pointer)


if __name__ == "__main__":
    unittest.main()
