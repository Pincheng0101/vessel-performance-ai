import AgentBuiltInToolAskUserQuestionResponse from './AgentBuiltInToolAskUserQuestionResponse';
import AgentBuiltInToolBashResponse from './AgentBuiltInToolBashResponse';
import AgentBuiltInToolBrowserResponse from './AgentBuiltInToolBrowserResponse';
import AgentBuiltInToolCodeResponse from './AgentBuiltInToolCodeResponse';
import AgentBuiltInToolGlobResponse from './AgentBuiltInToolGlobResponse';
import AgentBuiltInToolGrepResponse from './AgentBuiltInToolGrepResponse';
import AgentBuiltInToolReadResponse from './AgentBuiltInToolReadResponse';
import AgentBuiltInToolReadUrlResponse from './AgentBuiltInToolReadUrlResponse';
import AgentBuiltInToolSkillResponse from './AgentBuiltInToolSkillResponse';
import AgentBuiltInToolTaskResponse from './AgentBuiltInToolTaskResponse';
import AgentBuiltInToolWriteResponse from './AgentBuiltInToolWriteResponse';
import AgentBuiltInTools from './AgentBuiltInTools';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentBuiltInToolsResponse extends AgentBuiltInTools {
  constructor({
    ask_user_question,
    bash,
    browser,
    code,
    glob,
    grep,
    read,
    read_url,
    skill,
    task,
    write,
  } = {}) {
    super({
      askUserQuestion: ask_user_question ? new AgentBuiltInToolAskUserQuestionResponse(ask_user_question) : undefined,
      bash: bash ? new AgentBuiltInToolBashResponse(bash) : undefined,
      browser: browser ? new AgentBuiltInToolBrowserResponse(browser) : undefined,
      code: code ? new AgentBuiltInToolCodeResponse(code) : undefined,
      glob: glob ? new AgentBuiltInToolGlobResponse(glob) : undefined,
      grep: grep ? new AgentBuiltInToolGrepResponse(grep) : undefined,
      read: read ? new AgentBuiltInToolReadResponse(read) : undefined,
      readUrl: read_url ? new AgentBuiltInToolReadUrlResponse(read_url) : undefined,
      skill: skill ? new AgentBuiltInToolSkillResponse(skill) : undefined,
      task: task ? new AgentBuiltInToolTaskResponse(task) : undefined,
      write: write ? new AgentBuiltInToolWriteResponse(write) : undefined,
    });
  }
}

export default AgentBuiltInToolsResponse;
