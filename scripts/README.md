# Project Scripts

Helper scripts for managing the 56-card-game project.

## close-completed-test-cases.js

Automatically closes test cases whose parent user stories have been completed.

### Features
- ✅ Fetches all open test cases with `test-case` label
- ✅ Extracts parent user story number from each test case
- ✅ Checks if parent user story is closed
- ✅ Closes test case with verification comment if parent US is complete
- ✅ Generates summary report of actions taken

### Usage

#### 1. Get a GitHub Personal Access Token
Visit https://github.com/settings/tokens and create a new token with `repo` scope.

#### 2. Run the script
```bash
node close-completed-test-cases.js <your-github-token>
```

Or set as environment variable and run:
```bash
export GITHUB_TOKEN=ghp_your_token_here
node close-completed-test-cases.js $GITHUB_TOKEN
```

#### 3. Review the summary
The script will output:
- Number of test cases closed
- Number of test cases skipped (parent US still open)
- Any errors encountered

### Example Output

```
============================================================
Test Case Batch Closer
============================================================

Fetching open test cases...
Found 83 open test cases

Checking #88 (parent: US#23)... ✅ CLOSED
Checking #89 (parent: US#23)... ✅ CLOSED
Checking #102 (parent: US#27)... ✅ CLOSED
...

============================================================
Summary
============================================================
✅ Closed: 12
⏳ Skipped: 71
❌ Errors: 0
```

### How It Works

Each test case issue has a body like:
```markdown
## Parent User Story
#XX

## Test Case
**Given** ...
**When** ...
**Then** ...
```

The script:
1. Parses the parent US number from the body
2. Checks if that US is closed via GitHub API
3. If closed, adds a verification comment and closes the test case
4. If open, skips and moves to next test case

### Troubleshooting

**"GitHub token required" error**
- You forgot to pass the token as an argument
- Get a token from https://github.com/settings/tokens

**"GitHub API error (401)"**
- Token is invalid or expired
- Create a new token with `repo` scope

**"Could not fetch US#XX"**
- User story doesn't exist
- Check the test case to verify parent US number is correct

### Notes
- This script only closes test cases, it never reopens them
- Closed test cases will have a comment explaining why they were closed
- Safe to run multiple times (will not double-close issues)
