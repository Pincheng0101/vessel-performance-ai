import { Edge } from '~/models/workflow';

class ChoiceItemEdge extends Edge {
  constructor({
    id,
    label,
    source,
    sourceHandle,
    target,
  } = {}) {
    super({
      id,
      label,
      source,
      sourceHandle,
      target,
    });
  }
}

export default ChoiceItemEdge;
