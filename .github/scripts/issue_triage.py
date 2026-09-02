# /// script
# dependencies = [
#   "google-genai",
#   "requests"
# ]
# ///

import os
import sys
import json
import requests
from google import genai

def triage_issue():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY is not set.")
        sys.exit(0)  # exit gracefully if not set

    issue_title = os.environ.get("ISSUE_TITLE", "")
    issue_body = os.environ.get("ISSUE_BODY", "")
    issue_number = os.environ.get("ISSUE_NUMBER")
    repo = os.environ.get("REPOSITORY")
    github_token = os.environ.get("GITHUB_TOKEN")

    if not all([issue_number, repo, github_token]):
        print("Missing required GitHub environment variables.")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    prompt = f"""
    Analyze the following GitHub Issue and suggest appropriate labels.
    Return ONLY a JSON array of strings representing the suggested labels.
    Possible labels: bug, enhancement, documentation, question, help wanted, good first issue, wontfix, duplicate.

    Issue Title: <user_input>{issue_title}</user_input>
    Issue Body: <user_input>{issue_body}</user_input>
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        # Parse the JSON response
        text_response = response.text.strip()
        # Cleanup markdown formatting if present
        if text_response.startswith('```json'):
            text_response = text_response[7:-3]
        elif text_response.startswith('```'):
            text_response = text_response[3:-3]

        suggested_labels = json.loads(text_response.strip())

        if not isinstance(suggested_labels, list):
            print("Invalid response format from Gemini")
            sys.exit(1)

        print(f"Suggested labels: {suggested_labels}")

        # Apply labels via GitHub API
        url = f"https://api.github.com/repos/{repo}/issues/{issue_number}/labels"
        headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }

        data = {"labels": suggested_labels}
        res = requests.post(url, headers=headers, json=data)

        if res.status_code == 200:
            print("Successfully applied labels.")
        else:
            print(f"Failed to apply labels: {res.status_code} {res.text}")

    except Exception as e:
        print(f"Error during triage: {e}")
        sys.exit(1)

if __name__ == "__main__":
    triage_issue()
