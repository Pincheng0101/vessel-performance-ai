import { UsageConstant } from '~/constants';

class MeteringStartAthenaQuery {
  constructor({
    sql,
    filename,
    outputType = UsageConstant.AthenaOutputType.ROWS.value,
  } = {}) {
    this.sql = sql;
    this.filename = filename ?? null;
    this.outputType = outputType;
  }

  static toRequestPayload(request) {
    return {
      sql: request.sql,
      filename: request.filename,
      output_type: request.outputType,
    };
  }

  static buildTokenUsageReportSql(startDate, endDate) {
    const startYYYYMMDD = (startDate ?? '').replace(/-/g, '');
    const endYYYYMMDD = (endDate ?? '').replace(/-/g, '');
    return `SELECT
  CONCAT(year, '-', month, '-', day) AS date,
  t.user AS username,
  COALESCE(u.email, t.user) AS email,
  'llm' AS resource_type,
  t.llm_type AS resource_provider,
  t.model AS resource_name,
  CASE
    WHEN t.agent_id IS NOT NULL THEN 'agent'
    WHEN t.workflow_id IS NOT NULL THEN 'workflow'
    ELSE 'direct'
  END AS caller_type,
  COALESCE(t.agent_id, t.workflow_id) AS caller_id,
  COALESCE(t.input_tokens, 0) AS llm_input_tokens,
  COALESCE(t.output_tokens, 0) AS llm_output_tokens,
  COALESCE(t.cache_read_input_tokens, 0) AS llm_cache_read_input_tokens,
  COALESCE(t.cache_write_input_tokens, 0) AS llm_cache_write_input_tokens
FROM lfe_metering.token_usage t
LEFT JOIN lfe_metering.user_mapping u ON t.user = u.username
WHERE CONCAT(year, month, day) >= '${startYYYYMMDD}' AND CONCAT(year, month, day) <= '${endYYYYMMDD}'
ORDER BY date, t.user`;
  }
}

export default MeteringStartAthenaQuery;
