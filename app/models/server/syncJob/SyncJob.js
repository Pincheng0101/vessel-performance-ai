import { ResourceConstant, SyncJobConstant } from '~/constants';
import { Runtime } from '~/models/server';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class SyncJob extends Runtime {
  constructor({
    executionArn,
    forceFullSync,
    ignoreFailed,
    loaderId,
    mode,
    status,
    syncJobId,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      updatedTs,
    });
    this.executionArn = executionArn;
    this.forceFullSync = forceFullSync;
    this.ignoreFailed = ignoreFailed;
    this.loaderId = loaderId;
    this.mode = mode;
    this.syncJobId = syncJobId;
    this.systemInfo = systemInfo;
  }

  get id() {
    return this.syncJobId;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    const { totalObjects, totalDocs, exceptions, error, cause, startTs, stopTs } = this.systemInfo;
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldLoaderId'), value: this.loaderId, isCopyable: true, link: { href: resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, this.loaderId) } },
      { title: $i18n.t('__fieldExecutionArn'), value: this.executionArn, isCopyable: true, link: { href: arnUtils.toUrl(this.executionArn), target: '_blank' } },
      { title: $i18n.t('__fieldMode'), value: findField(SyncJobConstant.Mode, this.mode, 'title') },
      { title: $i18n.t('__fieldSyncJobTotalObjects'), value: numUtils.format(totalObjects) },
      { title: $i18n.t('__fieldSyncJobTotalDocs'), value: numUtils.format(totalDocs) },
      { title: $i18n.t('__fieldException', 2), value: exceptions, isChip: true, isHidden: !exceptions },
      { title: $i18n.t('__fieldError'), value: error, isChip: true, isHidden: !error },
      { title: $i18n.t('__fieldCause'), value: cause, isBlockText: true, isHidden: !cause },
      { title: $i18n.t('__fieldExecutionTime'), value: stopTs ? (stopTs - startTs) * 1000 : null, isTimeInterval: !!stopTs },
      { title: $i18n.t('__fieldStartTs'), value: startTs, isTimestamp: true, timestampOptions: { isRelative: false } },
      { title: $i18n.t('__fieldStopTs'), value: stopTs, isTimestamp: true, timestampOptions: { isRelative: false } },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {SyncJob} resource
   */
  static toRequestPayload(resource) {
    return {
      loader_id: resource.loaderId,
      sync_job_id: resource.syncJobId,
      force_full_sync: resource.forceFullSync,
      ignore_failed: resource.ignoreFailed,
    };
  }
}

export default SyncJob;
