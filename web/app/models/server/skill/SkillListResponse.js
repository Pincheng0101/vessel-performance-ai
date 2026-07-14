import SkillResponse from './SkillResponse';

class SkillListResponse {
  data = [];

  constructor(response) {
    this.data = response.skills.map(item => new SkillResponse(item));
    this.nextToken = response.next_token;
  }
}

export default SkillListResponse;
