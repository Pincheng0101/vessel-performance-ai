import { ActionExecutionConstant, DateConstant, UsageConstant } from '~/constants';
import {
  MeteringDescribeQuerySearchEngineUsage,
  MeteringDescribeQueryTokenUsage,
  MeteringGetAgentCreditUsage,
  MeteringGetAthenaQueryResult,
  MeteringStartAgentCreditUsage,
  MeteringStartAthenaQuery,
  MeteringStartQuerySearchEngineUsage,
  MeteringStartQueryTokenUsage,
} from '~/models/server/metering';
import { UsageRowsNormalizer } from '~/models/ui/usage';

let pricingTablePromise;
const POLL_DELAY_MS = 500;
const MAX_POLL_ATTEMPTS = 40;
const UsageQueryClientRegistry = Object.freeze({
  [UsageConstant.MeteringType.SEARCH_ENGINE.value]: {
    DescribeRequest: MeteringDescribeQuerySearchEngineUsage,
    StartRequest: MeteringStartQuerySearchEngineUsage,
    describeMethodName: 'describeQuerySearchEngineUsage',
    startMethodName: 'startQuerySearchEngineUsage',
  },
  [UsageConstant.MeteringType.TOKEN.value]: {
    DescribeRequest: MeteringDescribeQueryTokenUsage,
    StartRequest: MeteringStartQueryTokenUsage,
    describeMethodName: 'describeQueryTokenUsage',
    startMethodName: 'startQueryTokenUsage',
  },
});

export default function useMetering() {
  const { t } = useI18n();
  const dayjs = useDayjs();
  const snackbarStore = useSnackbarStore();
  const server = useServer();

  const toApiDate = (value) => {
    if (!value) {
      return null;
    }

    return dayjs(value).format(DateConstant.Format.FULL_DATE);
  };

  const fetchModelPricingTable = () => {
    if (!pricingTablePromise) {
      pricingTablePromise = (async () => {
        try {
          const { data, error } = await server.metering.getModelPricing({
            lazy: false,
          });

          if (error.value) {
            pricingTablePromise = null;
            snackbarStore.setFailure(t('__messageRequestError'));
            return {};
          }

          return data.value?.models ?? {};
        } catch {
          pricingTablePromise = null;
          snackbarStore.setFailure(t('__messageRequestError'));
          return {};
        }
      })();
    }

    return pricingTablePromise;
  };

  const getUsageQueryClient = (meteringType) => {
    const config = UsageQueryClientRegistry[meteringType];

    if (!config) {
      return null;
    }

    return {
      DescribeRequest: config.DescribeRequest,
      StartRequest: config.StartRequest,
      describe: (...args) => server.metering[config.describeMethodName](...args),
      start: (...args) => server.metering[config.startMethodName](...args),
    };
  };

  const pollQueryResult = async ({
    queryExecutionId,
    preset,
    usageQueryClient,
  }) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const { DescribeRequest, describe } = usageQueryClient;
      const { data, error } = await describe(new DescribeRequest({
        queryExecutionId,
        maxResults: preset.maxResults,
      }), {
        lazy: false,
      });

      if (error.value) {
        return null;
      }

      if (data.value.isSucceeded) {
        return data.value;
      }

      if (data.value.isFailed) {
        snackbarStore.setFailure(data.value.errorMessage || t('__messageServerError'));
        return null;
      }

      if (!data.value.isPending) {
        break;
      }

      await delay(POLL_DELAY_MS);
    }

    snackbarStore.setFailure(t('__messageRequestError'));
    return null;
  };

  const fetchUsageDataResult = async ({
    preset,
    startDate = null,
    endDate = null,
    requestBody: requestBodyOverride = {},
  }) => {
    const apiStartDate = toApiDate(startDate);
    const apiEndDate = toApiDate(endDate);
    const requestBody = {
      ...(preset.requestBody ?? {}),
      ...requestBodyOverride,
    };
    const usageQueryClient = getUsageQueryClient(preset.meteringType);

    if (!usageQueryClient) {
      return null;
    }

    const { StartRequest, start } = usageQueryClient;

    const { data, error } = await start(new StartRequest({
      ...requestBody,
      startDate: apiStartDate,
      endDate: apiEndDate,
    }), {
      lazy: false,
    });

    if (error.value) {
      return null;
    }

    const result = await pollQueryResult({
      queryExecutionId: data.value.queryExecutionId,
      preset,
      usageQueryClient,
    });

    if (!result) {
      return null;
    }

    return {
      rows: UsageRowsNormalizer.normalizeRowsByPreset({
        preset,
        rows: result.rows,
      }),
    };
  };

  const fetchUsageData = async (options) => {
    try {
      return await fetchUsageDataResult(options);
    } catch {
      snackbarStore.setFailure(t('__messageRequestError'));
      return null;
    }
  };

  const pollAthenaQueryResult = async ({ executionArn }) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const { data, error } = await server.metering.getAthenaQueryResult(new MeteringGetAthenaQueryResult({
        executionArn,
      }), {
        lazy: false,
      });

      if (error.value) {
        return null;
      }

      if (data.value.isSucceeded) {
        return data.value;
      }

      if (data.value.isFailed) {
        return { isFailed: true, errorMessage: data.value.errorMessage };
      }

      if (!data.value.isPending) {
        break;
      }
      await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    }

    return null;
  };

  const pollAgentCreditUsage = async ({ executionArn }) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const { data, error } = await server.metering.getAgentCreditUsage(new MeteringGetAgentCreditUsage({
        executionArn,
      }), {
        lazy: false,
      });

      if (error.value) {
        return null;
      }

      if (data.value.isSucceeded) {
        return data.value;
      }

      if (data.value.isFailed) {
        return { isFailed: true, errorMessage: data.value.errorMessage };
      }

      if (!data.value.isPending) {
        break;
      }
      await delay(POLL_DELAY_MS);
    }

    snackbarStore.setFailure(t('__messageRequestError'));
    return null;
  };

  const fetchAgentCreditUsageResult = async ({ agentId }) => {
    const { data, error } = await server.metering.startAgentCreditUsage(new MeteringStartAgentCreditUsage({
      agentId,
    }), {
      lazy: false,
    });
    if (error.value) {
      return null;
    }

    return pollAgentCreditUsage({ executionArn: data.value.executionArn });
  };

  const fetchAgentCreditUsage = async (options) => {
    try {
      return await fetchAgentCreditUsageResult(options);
    } catch {
      return null;
    }
  };

  const exportMeteringReport = async ({ startDate, endDate }) => {
    const apiStartDate = toApiDate(startDate);
    const apiEndDate = toApiDate(endDate);

    const { data, error } = await server.metering.startAthenaQuery(new MeteringStartAthenaQuery({
      sql: MeteringStartAthenaQuery.buildTokenUsageReportSql(apiStartDate, apiEndDate),
      filename: `report_${apiStartDate}_${apiEndDate}`,
      outputType: UsageConstant.AthenaOutputType.FILE.value,
    }), {
      lazy: false,
    });
    if (error.value) {
      return false;
    }

    const result = await pollAthenaQueryResult({
      executionArn: data.value.executionArn,
    });
    if (!result) {
      snackbarStore.setFailure(t('__messageRequestError'));
      return false;
    }
    if (result.isFailed) {
      snackbarStore.setFailure(result.errorMessage || t('__messageUsageExportReportDataTooLarge'));
      return false;
    }

    fileUtils.download({ url: result.presignedUrl });
    snackbarStore.setSuccess(t('__messageUsageExportReportSuccess'));
    return true;
  };

  return {
    exportMeteringReport,
    fetchAgentCreditUsage,
    fetchModelPricingTable,
    fetchUsageData,
  };
}
