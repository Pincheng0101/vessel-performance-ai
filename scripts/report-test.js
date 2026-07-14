import path from 'path';
import TestReporter from '../test-reporter/TestReporter.js';

const testReporter = new TestReporter(path.resolve(process.cwd(), 'playwright-report/test-results.json'));

testReporter.run();
