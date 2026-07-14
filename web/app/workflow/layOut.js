import { Position } from '@vue-flow/core';
import ELK from 'elkjs';
import { LayOutConstant, WorkflowConstant } from '~/constants';

export default async function layOut({
  algorithm = LayOutConstant.Algorithm.MRTREE,
  nodes,
  edges,
  findNode,
}) {
  const elk = new ELK();

  let layoutOptions;
  switch (algorithm) {
    case LayOutConstant.Algorithm.FORCE:
      layoutOptions = {
        'elk.algorithm': algorithm,
        'elk.force.temperature': 0.005,
        'elk.force.iterations': 1000,
        'elk.spacing.nodeNode': 4,
      };
      break;
    case LayOutConstant.Algorithm.MRTREE:
    default:
      layoutOptions = {
        'elk.algorithm': algorithm,
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': WorkflowConstant.Dimension.NODE_HORIZONTAL_SPACING,
      };
      break;
  }

  const layOut = async ({
    nodes,
  } = {}) => {
    const layoutUpdater = createLayoutUpdater({
      nodes,
    });

    const layoutGraphsFromInnerToRoot = async ({
      parentNodes = [],
      updatedNodes = [],
    } = {}) => {
      const nextLayerParentNodes = nodes.filter((node) => {
        if (parentNodes.length > 0) {
          return node.isParent && parentNodes.some(parentNode => parentNode.id === node.parentNode);
        }
        return node.isParent && !node.parentNode;
      });

      if (nextLayerParentNodes.length > 0) {
        await layoutGraphsFromInnerToRoot({
          parentNodes: nextLayerParentNodes,
          updatedNodes,
        });
      }

      // Get updated nodes for this layer, including node positions and parent dimensions
      const currentUpdatedNodes = await layoutUpdater({
        parentNodes,
      });

      for (const updatedNode of currentUpdatedNodes) {
        const index = updatedNodes.findIndex(node => node.id === updatedNode.id);
        if (index !== -1) {
          updatedNodes.splice(index, 1);
        }
      }
      // Nodes in outer layers are updated later, unshift updated nodes to ensure they are placed at the bottom in the graph
      updatedNodes.unshift(...currentUpdatedNodes);

      return [...updatedNodes];
    };

    return await layoutGraphsFromInnerToRoot();
  };

  const createLayoutUpdater = ({
    nodes,
  }) => {
    let updatedNodes = objUtils.toRaw([...nodes]);

    return async ({
      parentNodes = [],
    }) => {
      let layouts;
      if (parentNodes.length === 0) {
        layouts = [await layoutGraph({
          nodes: updatedNodes,
        })];
      } else {
        layouts = await Promise.all(
          parentNodes.map((node) => {
            return layoutGraph({
              nodes: updatedNodes.filter(n => n.parentNode === node.id),
              parentId: node.id,
            });
          }),
        );
      }

      // Update node positions and parent dimensions based on the layout results
      const currentUpdatedNodes = updateNodes({
        nodes: updatedNodes,
        layouts,
      });

      updatedNodes = updatedNodes.map(node => currentUpdatedNodes.find(n => n.id === node.id) || node);

      // Format nodes with updated dimensions and remove width and height
      const formattedNodes = currentUpdatedNodes.map((node) => {
        const result = {
          ...node,
          dimensions: {
            width: node.dimensions.width,
            height: node.dimensions.height,
          },
        };
        delete result.width;
        delete result.height;
        return result;
      });
      return formattedNodes;
    };
  };

  const layoutGraph = ({
    nodes,
    parentId,
  }) => {
    const childNodes = nodes.filter(node => node.parentNode === parentId);
    if (childNodes.length === 0) return null;
    const graphNodes = childNodes.map((node) => {
      const originalNode = findNode(node.id);
      const dimensions = originalNode
        ? (node.isParent ? node.dimensions : originalNode.dimensions)
        : node.dimensions;
      return {
        type: node.type,
        data: node.data,
        parentNode: node.parentNode,
        isParent: node.isParent,
        id: node.id,
        width: dimensions.width,
        height: dimensions.height,
        hidden: node.hidden,
      };
    });

    const graphEdges = edges.filter(edge =>
      childNodes.some(node => node.id === edge.source || node.id === edge.target),
    );

    const graph = {
      id: parentId || 'root',
      layoutOptions,
      children: graphNodes,
      edges: graphEdges,
    };
    return performElkLayout(graph);
  };

  // Perform ELK layout on a given graph structure
  const performElkLayout = async (graph) => {
    try {
      return await elk.layout(graph);
    } catch (error) {
      console.error('ELK layout error:', error);
      return { children: [] }; // Return empty graph in case of error
    }
  };

  // Update node positions and parent dimensions based on the layout results
  const updateNodes = ({
    nodes,
    layouts,
  }) => {
    const positionUpdatedNodes = mapPositions({
      nodes,
      layouts,
    });

    const updatedNodes = nodes.map(node => positionUpdatedNodes.find(n => n.id === node.id) || node);

    const dimensionsUpdatedNodes = [];

    for (const layout of layouts) {
      const parentNodeId = layout.id === 'root' ? null : layout.id;
      if (!parentNodeId) continue;
      const updated = updateParentNodeDimensions({
        nodes: updatedNodes,
        parentNodeId,
      });
      dimensionsUpdatedNodes.push(updated);
    }

    return [...positionUpdatedNodes, ...dimensionsUpdatedNodes];
  };

  const mapPositions = ({
    nodes,
    layouts,
  }) => {
    return layouts.flatMap((layout) => {
      const minPositionX = Math.min(...layout.children.map(node => node.x));
      const minPositionY = Math.min(...layout.children.map(node => node.y));
      const offsetX = minPositionX - WorkflowConstant.Dimension.PARENT_PADDING_X;
      const offsetY = minPositionY - WorkflowConstant.Dimension.PARENT_PADDING_TOP;

      return layout.children.map((node) => {
        const originalNode = findNode(node.id);
        const updatedNode = nodes.find(n => n.id === node.id);
        const dimensions = originalNode
          ? (node.isParent ? updatedNode.dimensions : originalNode.dimensions)
          : updatedNode.dimensions;
        const result = {
          ...updatedNode,
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
          position: {
            x: node.x ? (node.x - offsetX) : 0,
            y: node.y ? (node.y - offsetY) : 0,
          },
          dimensions,
          hidden: originalNode ? originalNode.hidden : false,
        };
        return result;
      });
    });
  };

  const updateParentNodeDimensions = ({
    nodes,
    parentNodeId = null,
  }) => {
    const parentNode = nodes.find(node => node.id === parentNodeId);

    const updatedWidth = getParentNodeWidth({
      parentNode,
      nodes,
    });
    const updatedHeight = getParentNodeHeight({
      parentNode,
      nodes,
    });

    parentNode.dimensions = {
      width: updatedWidth,
      height: updatedHeight,
    };
    return parentNode;
  };

  const getParentNodeWidth = ({
    nodes,
    parentNode,
  }) => {
    const childNodes = nodes.filter(node => node.parentNode === parentNode.id && !node.hidden);
    const minPositionX = Math.min(...childNodes.map(node => node.position.x));
    let maxPositionX = Math.max(...childNodes.map(node => node.position.x + node.dimensions.width));
    const childEdges = edges.filter(edge => childNodes.map(node => node.id).includes(edge.source) || childNodes.map(node => node.id).includes(edge.target));
    const rightAngleEdges = childEdges.filter(edge => edge.sourceX > edge.targetX);
    for (const edge of rightAngleEdges) {
      const id = edge.id;
      const gElement = document.querySelector(`[data-id="${id}"]`);
      const bBox = gElement.getBBox();
      maxPositionX = Math.max(maxPositionX, bBox.x - parentNode.position.x + bBox.width);
    }
    return childNodes.length > 0 ? maxPositionX - minPositionX + WorkflowConstant.Dimension.PARENT_PADDING_X * 2 : WorkflowConstant.Dimension.NODE_BASE_WIDTH;
  };

  const getParentNodeHeight = ({
    nodes,
    parentNode,
  }) => {
    const childNodes = nodes.filter(node => node.parentNode === parentNode.id && !node.hidden);
    const minPositionY = Math.min(...childNodes.map(node => node.position.y));
    let maxPositionY = Math.max(...childNodes.map(node => node.position.y + node.dimensions.height));
    const childEdges = edges.filter(edge => childNodes.map(node => node.id).includes(edge.source) || childNodes.map(node => node.id).includes(edge.target));
    const rightAngleEdges = childEdges.filter(edge => edge.sourceX > edge.targetX);
    for (const edge of rightAngleEdges) {
      const id = edge.id;
      const gElement = document.querySelector(`[data-id="${id}"]`);
      const bBox = gElement.getBBox();
      maxPositionY = Math.max(maxPositionY, bBox.y - parentNode.position.y + bBox.height);
    }
    return childNodes.length > 0 ? maxPositionY - minPositionY + WorkflowConstant.Dimension.PARENT_PADDING_TOP + WorkflowConstant.Dimension.PARENT_PADDING_BOTTOM : WorkflowConstant.Dimension.NODE_BASE_HEIGHT;
  };

  return await layOut({
    nodes,
  });
}
