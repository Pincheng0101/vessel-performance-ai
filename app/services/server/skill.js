import { ListConstant } from '~/constants';
import { Skill, SkillListResponse, SkillResponse } from '~/models/server/skill';

export default function skill({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  const list = ({
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/list-skills', {
      watch: false,
      lazy,
      signal,
      body: {
        next_token,
        limit,
        sort_field: sortField,
        sort_order: sortOrder,
        filters,
        filter_logic: filterLogic,
        search_string: query,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new SkillListResponse(finalResponse._data);
        }
      },
    });
  };

  const create = (resource) => {
    return client.post('/resource/create-skill', {
      watch: false,
      lazy: true,
      body: Skill.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new SkillResponse(finalResponse._data.skill);
        }
      },
    });
  };

  const get = ({
    skillId: skill_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-skill', {
      watch: false,
      lazy,
      body: {
        skill_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new SkillResponse(finalResponse._data.skill);
        }
        onResponse(response);
      },
    });
  };

  const update = (resource) => {
    return client.post('/resource/update-skill', {
      watch: false,
      lazy: true,
      body: Skill.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const destroy = ({
    skillId: skill_id,
  } = {}) => {
    return client.post('/resource/delete-skill', {
      watch: false,
      lazy: true,
      body: {
        skill_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const duplicate = async ({
    skillId: skill_id,
    newSkillName: new_skill_name,
  }) => {
    const { data, error } = await get({ skillId: skill_id });

    if (error.value) {
      return { data: null, error };
    }

    const newSkill = new Skill({
      ...data.value,
      skillName: new_skill_name,
    });
    return create(newSkill);
  };

  return {
    list,
    create,
    get,
    update,
    destroy,
    duplicate,
  };
}
