import { TestResult } from '../ObjectModel/TestResult';
import { TestCase } from '../ObjectModel/TestCase';
import { Event, IEventArgs } from '../Events/Event';
import { IEnvironment } from '../Environment/IEnvironment';
import { TimeSpan } from '../Utils/TimeSpan';
import { TestRunChangedEventArgs } from '../ObjectModel/Payloads/TestRunChangedEventArgs';
import { TestRunStatistics } from '../ObjectModel/TestRunStatistics';
import { TestOutcome } from '../ObjectModel/TestOutcome';

// override typings for
declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;

export class TestExecutionCache {
    public onTestRunStatsChange: Event<TestRunChangedEventArgs>;

    private testResultMap : Map<string, TestResult>;
    private inProgressTestMap : Map<string, TestCase>;

    private cacheCapacity: number;
    private cacheExpiryTime: number;
    private cacheTimer: number;
    private testRunStatistics: TestRunStatistics;

    constructor(environment: IEnvironment, cacheCapacity: number, cacheExpiryTime: string) {
        this.testResultMap = new Map<string, TestResult>();
        this.inProgressTestMap = new Map<string, TestCase>();

        this.testRunStatistics = {
            Stats: {},
            ExecutedTests: 0
        };

        this.onTestRunStatsChange = environment.createEvent();

        this.cacheCapacity = cacheCapacity;
        this.cacheExpiryTime = TimeSpan.StringToMS(cacheExpiryTime);
        this.cacheTimer = 0;

        this.setCacheExpireTimer();
    }

    public addTestResult(testResult: TestResult) {
        this.inProgressTestMap.delete(testResult.TestCase.id);
        this.testResultMap.set(testResult.TestCase.id, testResult);
        this.testRunStatistics.ExecutedTests += 1;

        if (this.testRunStatistics.Stats[testResult.Outcome]) {
            this.testRunStatistics.Stats[testResult.Outcome] += 1;
        } else {
            this.testRunStatistics.Stats[testResult.Outcome] = 1;
        }

        if (this.testResultMap.size === this.cacheCapacity) {
            this.onCacheHit();
        }
    }

    public addInProgressTest(testCase: TestCase) {
        // TODO data driven tests will override
        this.inProgressTestMap.set(testCase.id, testCase);
    }

    public cleanCache(): TestRunChangedEventArgs {
        if (!this.testRunStatistics.ExecutedTests) {
            return <TestRunChangedEventArgs> {
                NewTestResults: [],
                ActiveTests: [],
                TestRunStatistics: <TestRunStatistics> {
                    ExecutedTests: 0,
                    Stats: {}
                }
            };
        }

        // TODO testrunchanged event args does not really extend eventargs
        const args = <TestRunChangedEventArgs> {
            NewTestResults: Array.from(this.testResultMap.values()),
            ActiveTests: Array.from(this.inProgressTestMap.values()),
            TestRunStatistics: this.testRunStatistics
        };

        this.testRunStatistics = {
            Stats: {},
            ExecutedTests: 0
        };

        this.testResultMap.clear();

        return args;
    }

    private setCacheExpireTimer() {
        clearTimeout(this.cacheTimer);
        this.cacheTimer = setTimeout(this.onCacheHit, this.cacheExpiryTime);
    }

    private onCacheHit = () => {
        this.setCacheExpireTimer();
        if (this.testRunStatistics.ExecutedTests > 0) {
            this.onTestRunStatsChange.raise(this, this.cleanCache());
        }
    }
}