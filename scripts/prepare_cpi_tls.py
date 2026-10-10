"""Build a TLS bundle for the official DGBAS host, without disabling verification.

This host currently omits its TWCA intermediate certificate. Download ONLY the
issuer and cross-certificate from the certificate authority's authenticated
HTTPS host. Pin their exact SHA256 and cryptographically validate the presented
server certificate through the existing trusted root store, including hostname.
Unverified TLS is used solely to read the public peer certificate for offline
chain inspection, never to fetch dataset content.
"""
import hashlib
import os
from pathlib import Path
import ssl
import subprocess
import tempfile
from urllib.request import urlopen

import certifi

HOST = "ws.dgbas.gov.tw"
CA = (
    ("Cyber_SSL_2023.crt", "01af2324d098098f5e0cdf6faabada430b21cce777f47eacb26248b2fda3e531"),
    ("GlobalCrossCyber_2022.crt", "c619f4e6f7b1baa7a6c6f244092a3f82e46a6d67bee26337fbaf02546f33133f"),
)
CA_HOST = "https://sslserver.twca.com.tw/cacert/"
OUTPUT = Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir())) / "twd-cpi-twca-trusted.pem"

def make_bundle():
    chain = []
    for filename, expected in CA:
        with urlopen(CA_HOST + filename, timeout=30) as response:
            assert response.url.startswith(CA_HOST), "CA URL redirected outside issuer host"
            cert_der = response.read(16385)
        if len(cert_der) > 16384 or hashlib.sha256(cert_der).hexdigest() != expected:
            raise RuntimeError("TWCA official issuer digest mismatch: " + filename)
        chain.append(ssl.DER_cert_to_PEM_cert(cert_der))

    # Read the public peer leaf only. NO CPI data transfer or trust bypass.
    # OpenSSL below verifies the captured leaf against a trusted CA root.
    leaf = ssl.get_server_certificate((HOST, 443), timeout=30)
    with tempfile.TemporaryDirectory() as directory:
        folder = Path(directory)
        leaf_file = folder / "peer-leaf.pem"
        chain_file = folder / "issuer-chain.pem"
        leaf_file.write_text(leaf, encoding="ascii")
        chain_file.write_text("\n".join(chain), encoding="ascii")
        verified = subprocess.run(
            ["openssl", "verify", "-CAfile", certifi.where(),
             "-untrusted", str(chain_file), "-verify_hostname", HOST, str(leaf_file)],
            capture_output=True, text=True, timeout=25,
        )
        if verified.returncode:
            raise RuntimeError("Failed to validate DGBAS against trusted root: " + verified.stderr)

    OUTPUT.write_bytes(Path(certifi.where()).read_bytes().rstrip() + b"\n" +
                       ("\n".join(chain)).encode("ascii"))
    print("Official issuer chain validated, hostname verified, pinned certs matched.")
    print("TLS CA bundle ready: " + str(OUTPUT))
    github_env = os.environ.get("GITHUB_ENV")
    if github_env:
        with open(github_env, "a", encoding="utf-8") as file:
            file.write("CPI_CA_BUNDLE=" + str(OUTPUT) + "\n")

if __name__ == "__main__":
    make_bundle()
