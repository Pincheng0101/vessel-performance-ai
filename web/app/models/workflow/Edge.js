import { WorkflowConstant } from '~/constants';
import MarkerEnd from './MarkerEnd';

class Edge {
  constructor({
    id,
    type = WorkflowConstant.EdgeType.CUSTOM,
    label,
    source,
    sourceHandle,
    target,
    targetHandle,
    animated = false,
    markerEnd,
  } = {}) {
    this.id = id;
    this.type = type;
    this.label = label;
    this.source = source;
    this.sourceHandle = sourceHandle;
    this.target = target;
    this.targetHandle = targetHandle;
    this.animated = animated;
    this.markerEnd = new MarkerEnd(markerEnd);
  }
}

export default Edge;
