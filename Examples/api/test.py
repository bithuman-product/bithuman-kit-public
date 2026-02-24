"""bitHuman Platform API -- Quick Validation

Zero-friction test to verify your API credentials are working.

Usage:
    export BITHUMAN_API_SECRET=your_secret
    python test.py

    # Or with a .env file in the current directory:
    python test.py
"""

import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BITHUMAN_API_URL", "https://api.bithuman.ai")


def get_headers():
    secret = os.getenv("BITHUMAN_API_SECRET")
    if not secret:
        print("FAIL: BITHUMAN_API_SECRET not set.")
        print()
        print("  Fix: Get your API secret from https://www.bithuman.ai/#developer")
        print("  Then: export BITHUMAN_API_SECRET='your_secret'")
        print("  Or:   Add it to a .env file in this directory")
        sys.exit(1)
    return {"Content-Type": "application/json", "api-secret": secret}


def test_validate():
    """Test 1: POST /v1/validate -- check API secret is valid."""
    print("Test 1: Validating API secret...")
    try:
        resp = requests.post(f"{BASE_URL}/v1/validate", headers=get_headers())
    except requests.exceptions.ConnectionError:
        print(f"  FAIL: Cannot reach {BASE_URL}")
        print("  Fix:  Check your internet connection")
        return False

    if resp.status_code == 401:
        print("  FAIL: Invalid API secret")
        print("  Fix:  Check your BITHUMAN_API_SECRET value")
        print("        Get a valid secret from https://www.bithuman.ai/#developer")
        return False

    if resp.status_code != 200:
        print(f"  FAIL: HTTP {resp.status_code} -- {resp.text[:200]}")
        return False

    data = resp.json()
    if data.get("valid"):
        print("  PASS: API secret is valid")
        return True

    print(f"  FAIL: Unexpected response: {data}")
    return False


def test_agents():
    """Test 2: GET /v1/agents -- list agents (verifies broader API access)."""
    print("Test 2: Listing agents...")
    try:
        resp = requests.get(f"{BASE_URL}/v1/agents", headers=get_headers())
    except requests.exceptions.ConnectionError:
        print(f"  FAIL: Cannot reach {BASE_URL}")
        return False

    if resp.status_code == 401:
        print("  FAIL: Authentication failed")
        return False

    if resp.status_code == 404:
        # Endpoint may not exist in all API versions -- not a failure
        print("  SKIP: /v1/agents endpoint not available")
        return True

    if resp.status_code != 200:
        print(f"  FAIL: HTTP {resp.status_code} -- {resp.text[:200]}")
        return False

    data = resp.json()
    agents = data.get("data", [])
    if isinstance(agents, list):
        print(f"  PASS: Found {len(agents)} agent(s)")
        for agent in agents[:3]:
            name = agent.get("name", "unnamed")
            agent_id = agent.get("agent_id", "?")
            print(f"        - {name} ({agent_id})")
        if len(agents) > 3:
            print(f"        ... and {len(agents) - 3} more")
    else:
        print(f"  PASS: API responded successfully")
    return True


def main():
    print(f"bitHuman API Test ({BASE_URL})")
    print("=" * 50)
    print()

    results = []
    results.append(("Validate API Secret", test_validate()))
    print()
    results.append(("List Agents", test_agents()))
    print()

    # Summary
    print("=" * 50)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    print(f"Results: {passed}/{total} passed")
    print()

    if passed == total:
        print("All tests passed! Your API credentials are working.")
        print()
        print("Next steps:")
        print("  - Generate an agent:  python generation.py --prompt 'You are a helpful assistant' --download")
        print("  - Manage agents:      python management.py --agent-id YOUR_AGENT_ID")
        print("  - Run an example:     cd ../essence-cloud && docker compose up")
    else:
        print("Some tests failed. Check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
