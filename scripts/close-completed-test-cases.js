#!/usr/bin/env node

/**
 * Batch close test cases for completed user stories
 * 
 * Usage: node close-completed-test-cases.js [github-token]
 * 
 * This script:
 * 1. Fetches all open test cases with the "test-case" label
 * 2. Extracts the parent user story number from each test case
 * 3. Checks if that user story is closed
 * 4. Closes the test case with a verification comment
 */

const https = require('https');

const REPO_OWNER = 'skmathunny';
const REPO_NAME = '56-card-game';

// Parse command line arguments
const githubToken = process.argv[2];
if (!githubToken) {
  console.error('Error: GitHub token required');
  console.error('Usage: node close-completed-test-cases.js <github-token>');
  console.error('\nGet a token from: https://github.com/settings/tokens');
  process.exit(1);
}

/**
 * Make an HTTP request to GitHub API
 */
function makeGitHubRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path,
      method,
      headers: {
        'User-Agent': 'Node.js Test Case Closer',
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`GitHub API error (${res.statusCode}): ${parsed.message || data}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Extract parent user story number from test case body
 * Format: "## Parent User Story\n#XX" or "## Parent User Story\\n#XX"
 */
function extractParentUserStory(body) {
  // Handle both actual newlines and escaped newlines in JSON
  const match = body.match(/##\s+Parent User Story\s*(?:\n|\\n)\s*#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get all open test cases
 */
async function getOpenTestCases() {
  console.log('Fetching open test cases...');
  
  let allTestCases = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const path = `/repos/${REPO_OWNER}/${REPO_NAME}/issues?labels=test-case&state=open&page=${page}&per_page=100`;
    const response = await makeGitHubRequest(path);
    
    if (!Array.isArray(response)) {
      hasMore = false;
      break;
    }

    allTestCases = allTestCases.concat(response);
    hasMore = response.length === 100;
    page++;

    if (hasMore) {
      console.log(`  Fetched ${allTestCases.length} test cases...`);
    }
  }

  console.log(`Found ${allTestCases.length} open test cases\n`);
  return allTestCases;
}

/**
 * Check if a user story is closed
 */
async function isUserStoryClosed(usNumber) {
  try {
    const path = `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${usNumber}`;
    const issue = await makeGitHubRequest(path);
    return issue.state === 'closed';
  } catch (error) {
    console.error(`  ⚠️  Could not fetch US#${usNumber}: ${error.message}`);
    return false;
  }
}

/**
 * Add a closing comment to a test case
 */
async function addClosingComment(issueNumber, parentUserStory) {
  const body = `✅ **Auto-Closed: Parent User Story Complete**\n\nThis test case is closing because the parent user story #${parentUserStory} has been completed and verified.\n\nIf this closure is in error, please reopen and let us know!`;

  const path = `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`;
  await makeGitHubRequest(path, 'POST', { body });
}

/**
 * Close a test case
 */
async function closeTestCase(issueNumber) {
  const path = `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
  await makeGitHubRequest(path, 'PATCH', {
    state: 'closed',
    state_reason: 'completed'
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Test Case Batch Closer');
    console.log('='.repeat(60));
    console.log();

    const testCases = await getOpenTestCases();
    
    let closedCount = 0;
    let skippedCount = 0;
    const results = {
      closed: [],
      skipped: [],
      errors: []
    };

    for (const testCase of testCases) {
      const tcNumber = testCase.number;
      const tcTitle = testCase.title;
      const parentUS = extractParentUserStory(testCase.body);

      if (!parentUS) {
        console.log(`⚠️  #${tcNumber}: No parent user story found - skipping`);
        skippedCount++;
        results.skipped.push({ number: tcNumber, reason: 'No parent US found' });
        continue;
      }

      process.stdout.write(`Checking #${tcNumber} (parent: US#${parentUS})...`);

      try {
        const isClosed = await isUserStoryClosed(parentUS);

        if (isClosed) {
          // Add comment before closing
          await addClosingComment(tcNumber, parentUS);
          // Close the issue
          await closeTestCase(tcNumber);
          console.log(' ✅ CLOSED');
          closedCount++;
          results.closed.push({ number: tcNumber, parentUS, title: tcTitle });
        } else {
          console.log(' ⏳ OPEN (parent US still open)');
          skippedCount++;
          results.skipped.push({ number: tcNumber, reason: `US#${parentUS} still open` });
        }
      } catch (error) {
        console.log(` ❌ ERROR: ${error.message}`);
        results.errors.push({ number: tcNumber, error: error.message });
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`✅ Closed: ${closedCount}`);
    console.log(`⏳ Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log();

    if (results.closed.length > 0) {
      console.log('Closed test cases:');
      results.closed.forEach(tc => {
        console.log(`  #${tc.number} - US#${tc.parentUS}`);
      });
      console.log();
    }

    if (results.errors.length > 0) {
      console.log('Errors:');
      results.errors.forEach(err => {
        console.log(`  #${err.number}: ${err.error}`);
      });
      console.log();
    }

    process.exit(results.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
