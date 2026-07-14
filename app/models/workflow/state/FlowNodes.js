import FlowChoiceNode from '~/components/FlowChoiceNode';
import FlowEndNode from '~/components/FlowEndNode';
import FlowFailNode from '~/components/FlowFailNode';
import FlowMapNode from '~/components/FlowMapNode';
import FlowParallelNode from '~/components/FlowParallelNode';
import FlowPassNode from '~/components/FlowPassNode';
import FlowSlotNode from '~/components/FlowSlotNode';
import FlowStartNode from '~/components/FlowStartNode';
import FlowSucceedNode from '~/components/FlowSucceedNode';
import FlowWaitNode from '~/components/FlowWaitNode';
import { StateConstant } from '~/constants';

const { Type, PseudoType } = StateConstant;

const FlowNodes = [
  {
    name: Type.CHOICE.value,
    component: FlowChoiceNode,
  },
  {
    name: Type.FAIL.value,
    component: FlowFailNode,
  },
  {
    name: Type.MAP.value,
    component: FlowMapNode,
  },
  {
    name: Type.PARALLEL.value,
    component: FlowParallelNode,
  },
  {
    name: Type.PASS.value,
    component: FlowPassNode,
  },
  {
    name: Type.SUCCEED.value,
    component: FlowSucceedNode,
  },
  {
    name: Type.WAIT.value,
    component: FlowWaitNode,
  },
  {
    name: PseudoType.END.value,
    component: FlowEndNode,
  },
  {
    name: PseudoType.SLOT.value,
    component: FlowSlotNode,
  },
  {
    name: PseudoType.START.value,
    component: FlowStartNode,
  },
];

export default FlowNodes;
