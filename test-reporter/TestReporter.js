import fs from 'fs';
import https from 'https';
import { URL } from 'url';

/**
 * @import { JSONReport, JSONReportSuite } from '@playwright/test/reporter'
 */

const {
  CI_PIPELINE_URL,
  CI_PROJECT_NAME,
  CI,
  GITLAB_USER_NAME,
  SLACK_WEBHOOK_URL,
  TEST_JOB_URL,
  TEST_PROJECT = 'local',
} = process.env;

const Color = Object.freeze({
  SUCCESS: '#008000',
  FAILURE: '#FF0000',
  WARNING: '#FFA500',
});

const Status = Object.freeze({
  FAILED: 'failed',
  INTERRUPTED: 'interrupted',
  PASSED: 'passed',
  SKIPPED: 'skipped',
  TIMED_OUT: 'timedOut',
});

/**
 * TestReporter class for generating Slack notifications from Playwright test results
 *
 * Development steps:
 * 1. Run the script: `node ./scripts/report-test.js | pbcopy`
 * 2. Paste the content to https://app.slack.com/block-kit-builder
 * 3. Check the preview to verify the Slack message format
 */
class TestReporter {
  /**
   * @type {JSONReport}
   */
  report;

  constructor(reportPath) {
    this.report = this.loadReport(reportPath);
  }

  get triggeredByUserName() {
    return GITLAB_USER_NAME || 'unknown';
  }

  get triggeredByProjectName() {
    return CI_PROJECT_NAME || 'unknown';
  }

  get reportUrl() {
    return `${TEST_JOB_URL || 'http://unknown'}/artifacts/external_file/playwright-report/index.html`;
  }

  get pipelineUrl() {
    return `${CI_PIPELINE_URL || 'http://unknown'}`;
  }

  loadReport(path) {
    // `path` is supplied by the CI build script (fixed report location), not external user input. False positive — internal CI tooling, not a runtime-exposed path.
    // nosemgrep: eslint.detect-non-literal-fs-filename
    if (!fs.existsSync(path)) {
      console.error(`No report found at ${path}`);
      process.exit(1);
    }

    // `path` is supplied by the CI build script, not external user input. False positive.
    // nosemgrep: eslint.detect-non-literal-fs-filename
    const content = fs.readFileSync(path, 'utf-8');

    return JSON.parse(content);
  }

  /**
   * Summarizes the Playwright test report results
   *
   * @param {JSONReport} report
   */
  summarize(report) {
    const failureStatuses = new Set([Status.FAILED, Status.INTERRUPTED, Status.TIMED_OUT]);
    const messageBlocks = [];

    /**
     * @param {JSONReportSuite} suite
     * @param {string[]} titles
     * @param {object[]} messageBlocks
     */
    const processSuite = (suite, titles = [], messageBlocks = []) => {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const latestResult = test.results.at(-1);
          if (!latestResult) continue;
          const { status } = latestResult;
          if (failureStatuses.has(status)) {
            const title = [...titles, suite.title, spec.title].join(' › ');
            messageBlocks.push({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Test:*\n ${title}\n*Status:*\n ${String(status).toUpperCase()}\n`,
              },
            });
          }
        }
      }
      for (const childSuite of suite.suites || []) {
        processSuite(childSuite, [...titles, suite.title], messageBlocks);
      }
    };

    for (const suite of report.suites || []) {
      processSuite(suite, [], messageBlocks);
    }

    return messageBlocks;
  }

  createMessagePayload() {
    const { stats } = this.report;

    const color = (() => {
      if (stats.unexpected > 0) return Color.FAILURE;
      if (stats.flaky > 0) return Color.WARNING;
      return Color.SUCCESS;
    })();

    const title = stats.unexpected > 0
      ? `[${String(TEST_PROJECT).toUpperCase()}] 🚨 E2E testing reported ${stats.unexpected} test${'s'.repeat(stats.unexpected !== 1)} failed`
      : `[${String(TEST_PROJECT).toUpperCase()}] ✅ E2E testing reported all tests passed`;

    const messageBlocks = this.summarize(this.report);

    const messagePayload = {
      attachments: [
        {
          fallback: title,
          color,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: title,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Failed:*\n${stats.unexpected}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Flaky:*\n${stats.flaky}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Passed:*\n${stats.expected}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Skipped:*\n${stats.skipped}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Triggered by \`${this.triggeredByUserName}\` from \`${this.triggeredByProjectName}\``,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View test report',
                    emoji: true,
                  },
                  url: this.reportUrl,
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View pipeline',
                    emoji: true,
                  },
                  url: this.pipelineUrl,
                },
              ],
            },
            ...messageBlocks.flatMap((block, i, arr) => i < arr.length ? [{ type: 'divider' }, block] : [block]),
          ],
        },
      ],
    };

    return messagePayload;
  }

  sendToSlack(messagePayload) {
    const url = new URL(SLACK_WEBHOOK_URL);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => {
      res.resume();
      res.on('end', () => {
        process.exit(res.statusCode === 200 ? 0 : 1);
      });
    });
    req.on('error', (err) => {
      console.error(`Slack request error: ${err}`);
      process.exit(1);
    });
    req.write(JSON.stringify(messagePayload));
    req.end();
  }

  run() {
    const messagePayload = this.createMessagePayload();
    if (!CI) {
      console.debug(JSON.stringify(messagePayload, null, 2));
      return;
    }
    this.sendToSlack(messagePayload);
  }
}

export default TestReporter;
