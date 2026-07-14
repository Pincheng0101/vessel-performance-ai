class MeteringGetModelPricingResponse {
  constructor({
    models,
  } = {}) {
    this.models = Object.entries(models ?? {}).reduce((result, [model, pricing]) => ({
      ...result,
      [model]: {
        inputTokenPrice: Number(pricing.input_per_token ?? 0),
        outputTokenPrice: Number(pricing.output_per_token ?? 0),
        cacheReadTokenPrice: Number(pricing.cache_read_per_token ?? 0),
        cacheWriteTokenPrice: Number(pricing.cache_write_per_token ?? 0),
      },
    }), {});
  }
}

export default MeteringGetModelPricingResponse;
