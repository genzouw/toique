with open(".husky/pre-commit", "r") as f:
    content = f.read()

content = content.replace("detect-secrets-hook --baseline .secrets.baseline $staged_files", 'detect-secrets-hook --baseline .secrets.baseline "$staged_files"')

with open(".husky/pre-commit", "w") as f:
    f.write(content)
