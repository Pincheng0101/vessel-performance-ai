import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class Skill extends Resource {
  constructor({
    description,
    skillId,
    skillMarkdown,
    skillName,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    this.description = description ?? '';
    this.skillId = skillId ?? '';
    this.skillMarkdown = skillMarkdown ?? '';
    this.skillName = skillName ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.SKILL.value;
  }

  get id() {
    return this.skillId;
  }

  get name() {
    return this.skillName;
  }

  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldDescription'), value: this.description },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  get skillMarkdownDisplayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldSkillMarkdown'), value: this.skillMarkdown, isMarkdown: true },
    ].filter(item => !strUtils.isEmpty(item.value));
  }

  /**
   * @param {Skill} resource
   */
  static toRequestPayload(resource) {
    return {
      description: resource.description,
      skill_id: resource.skillId,
      skill_markdown: resource.skillMarkdown,
      skill_name: resource.skillName,
    };
  }
}

export default Skill;
