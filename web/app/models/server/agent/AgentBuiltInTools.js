import AgentBuiltInToolAskUserQuestion from './AgentBuiltInToolAskUserQuestion';
import AgentBuiltInToolBash from './AgentBuiltInToolBash';
import AgentBuiltInToolBrowser from './AgentBuiltInToolBrowser';
import AgentBuiltInToolCode from './AgentBuiltInToolCode';
import AgentBuiltInToolGlob from './AgentBuiltInToolGlob';
import AgentBuiltInToolGrep from './AgentBuiltInToolGrep';
import AgentBuiltInToolRead from './AgentBuiltInToolRead';
import AgentBuiltInToolReadUrl from './AgentBuiltInToolReadUrl';
import AgentBuiltInToolSkill from './AgentBuiltInToolSkill';
import AgentBuiltInToolTask from './AgentBuiltInToolTask';
import AgentBuiltInToolWrite from './AgentBuiltInToolWrite';

class AgentBuiltInTools {
  constructor({
    askUserQuestion,
    bash,
    browser,
    code,
    glob,
    grep,
    read,
    readUrl,
    skill,
    task,
    write,
  } = {}) {
    this.askUserQuestion = askUserQuestion ? new AgentBuiltInToolAskUserQuestion(askUserQuestion) : undefined;
    this.bash = bash ? new AgentBuiltInToolBash(bash) : undefined;
    this.browser = browser ? new AgentBuiltInToolBrowser(browser) : undefined;
    this.code = code ? new AgentBuiltInToolCode(code) : undefined;
    this.glob = glob ? new AgentBuiltInToolGlob(glob) : undefined;
    this.grep = grep ? new AgentBuiltInToolGrep(grep) : undefined;
    this.read = read ? new AgentBuiltInToolRead(read) : undefined;
    this.readUrl = readUrl ? new AgentBuiltInToolReadUrl(readUrl) : undefined;
    this.skill = skill ? new AgentBuiltInToolSkill(skill) : undefined;
    this.task = task ? new AgentBuiltInToolTask(task) : undefined;
    this.write = write ? new AgentBuiltInToolWrite(write) : undefined;
  }

  /**
   * @param {AgentBuiltInTools} tools
   */
  static toRequestPayload(tools) {
    return {
      ask_user_question: tools.askUserQuestion ? AgentBuiltInToolAskUserQuestion.toRequestPayload(tools.askUserQuestion) : undefined,
      bash: tools.bash ? AgentBuiltInToolBash.toRequestPayload(tools.bash) : undefined,
      browser: tools.browser ? AgentBuiltInToolBrowser.toRequestPayload(tools.browser) : undefined,
      code: tools.code ? AgentBuiltInToolCode.toRequestPayload(tools.code) : undefined,
      glob: tools.glob ? AgentBuiltInToolGlob.toRequestPayload(tools.glob) : undefined,
      grep: tools.grep ? AgentBuiltInToolGrep.toRequestPayload(tools.grep) : undefined,
      read: tools.read ? AgentBuiltInToolRead.toRequestPayload(tools.read) : undefined,
      read_url: tools.readUrl ? AgentBuiltInToolReadUrl.toRequestPayload(tools.readUrl) : undefined,
      skill: tools.skill ? AgentBuiltInToolSkill.toRequestPayload(tools.skill) : undefined,
      task: tools.task ? AgentBuiltInToolTask.toRequestPayload(tools.task) : undefined,
      write: tools.write ? AgentBuiltInToolWrite.toRequestPayload(tools.write) : undefined,
    };
  }
}

export default AgentBuiltInTools;
