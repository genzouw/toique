# /// script
# dependencies = [
#   "google-genai",
#   "requests",
# ]
# ///
import os
import json
import requests
from google import genai
from google.genai import types

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found. Skipping triage.")
        return

    issue_data_str = os.environ.get("ISSUE_DATA")
    if not issue_data_str:
        print("ISSUE_DATA not found.")
        return

    github_token = os.environ.get("GITHUB_TOKEN")
    github_repository = os.environ.get("GITHUB_REPOSITORY")

    issue = json.loads(issue_data_str)
    issue_title = issue.get("title", "")
    issue_body = issue.get("body", "")
    issue_number = issue.get("number")

    if not issue_number or not github_repository or not github_token:
        print("Missing GitHub context to post a comment.")
        return

    client = genai.Client(api_key=api_key)

    prompt = f"""
    Please analyze the following GitHub Issue and provide a triage summary, suggesting potential labels (e.g., bug, enhancement, question) and a brief recommended action or root cause analysis.

    Respond in Japanese.

    Issue Title: <user_input>{issue_title}</user_input>
    Issue Body:
    <user_input>
    {issue_body}
    </user_input>
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        triage_result = response.text
        print("Triage generated successfully.")

        # GitHub にコメントを投稿
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {github_token}",
            "X-GitHub-Api-Version": "2022-11-28"
        }

        comment_body = f"🤖 **AI Issue Triage (Gemini)**\n\n{triage_result}"

        url = f"https://api.github.com/repos/{github_repository}/issues/{issue_number}/comments"
        res = requests.post(url, headers=headers, json={"body": comment_body})

        if res.status_code == 201:
            print("Successfully posted triage comment.")
        else:
            print(f"Failed to post comment: {res.status_code} {res.text}")

    except Exception as e:
        print(f"Error during Gemini processing: {e}")

if __name__ == "__main__":
    main()
