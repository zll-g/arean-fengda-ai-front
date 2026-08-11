//#region 自定义函数
/**
 * 树形结构查询单个节点
 * @param tree
 * @param getChildren
 * @param predicate
 * @returns
 */
export const findTreeNode = <T>(
  tree: T[],
  getChildren: (node: T) => T[] | undefined,
  predicate: (node: T) => boolean,
): T | undefined => {
  // 如果没有树或节点为空，则返回 undefined
  if (!tree || tree.length === 0) {
    return undefined;
  }
  for (let data of tree) {
    // 如果当前节点满足条件，则返回该节点
    if (predicate(data)) {
      return data;
    }
    // 如果当前节点有子节点，则递归查找子节点
    const children = getChildren(data);
    if (children) {
      const foundNode = findTreeNode(children, getChildren, predicate);
      if (foundNode) {
        return foundNode;
      }
    }
  }
  return undefined;
};

/**
 * 树形结构查询符合条件的节点集合
 * @param tree
 * @param getChildren
 * @param predicate
 * @returns
 */
export const findTreeNodes = <T>(
  tree: T[],
  getChildren: (node: T) => T[] | undefined,
  predicate: (node: T) => boolean,
): T[] => {
  const result: T[] = [];

  const traverse = (nodes: T[]) => {
    for (let data of nodes) {
      // 如果当前节点满足条件，则添加到结果数组中
      if (predicate(data)) {
        result.push(data);
      }
      // 如果当前节点有子节点，则递归查找子节点
      const children = getChildren(data);
      if (children) {
        traverse(children);
      }
    }
  };

  traverse(tree);

  // 如果没有找到任何节点，则返回空数组
  return result.length > 0 ? result : [];
};

/**
 * 查询符合条件的所有父级节点集合
 * @param tree
 * @param getChildren
 * @param predicate
 * @returns
 */
export const findParentNodes = <T>(
  tree: T[],
  getChildren: (node: T) => T[] | undefined,
  predicate: (node: T) => boolean,
): Array<T> | undefined => {
  // 如果没有树或节点为空，则返回 undefined
  if (!tree || tree.length === 0) {
    return undefined;
  }
  for (let data of tree) {
    // 如果当前节点满足条件，则返回该节点
    if (predicate(data)) {
      return [data];
    }
    // 如果当前节点有子节点，则递归查找子节点
    const children = getChildren(data);
    if (children) {
      let node = findParentNodes(children, getChildren, predicate);
      if (node !== undefined) {
        return node.concat(data);
      }
    }
  }
};

/**
 * 查询符合条件的所有子节点集合(包括当前节点)
 * @param tree
 * @param getChildren
 * @param predicate
 * @returns
 */
export const findAllChildNodes = <T>(
  tree: T[],
  getChildren: (node: T) => T[] | undefined,
  predicate: (node: T) => boolean,
): T[] => {
  const result: T[] = [];
  let found = false;
  const traverse = (nodes: T[]) => {
    if (!nodes || nodes.length === 0 || found) {
      return;
    }
    for (let node of nodes) {
      // 如果当前节点满足条件，则将该节点及其所有子节点添加到结果数组中
      if (predicate(node)) {
        found = true;
        addAllNodes(node, result);
        return; // 找到后停止遍历
      }
      // 如果当前节点有子节点，则递归遍历子节点
      const children = getChildren(node);
      if (children) {
        traverse(children);
      }
    }
  };
  const addAllNodes = (node: T, result: T[]) => {
    result.push(node);
    const children = getChildren(node);
    if (children) {
      for (let child of children) {
        addAllNodes(child, result);
      }
    }
  };
  traverse(tree);
  return result;
};

/**
 * 递归获取树形结构中所有节点的 ID
 * @param tree 树形结构数据
 * @param getChildren 获取子节点的方法
 * @returns 包含所有 ID 的数组
 */
export const getAllIdsFromTree = <T extends { id?: string }>(
  tree: T[],
  getChildren: (node: T) => T[] | undefined,
): string[] => {
  const result: string[] = [];

  const traverse = (nodes: T[]) => {
    for (const node of nodes) {
      // 如果当前节点有 ID，则添加到结果数组中
      if (node.id) {
        result.push(node.id);
      }

      // 递归处理子节点
      const children = getChildren(node);
      if (children) {
        traverse(children);
      }
    }
  };

  traverse(tree);

  return result;
};
