import type { ProblemMetaData } from "../../types/index.js";

const LIST_NODE_HELPERS = `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def _build_list(arr):
    head = None
    tail = None
    for v in arr:
        node = ListNode(v)
        if head is None:
            head = node
            tail = node
        else:
            tail.next = node
            tail = node
    return head

def _list_to_arr(node):
    out = []
    while node is not None:
        out.append(node.val)
        node = node.next
    return out
`;

const TREE_NODE_HELPERS = `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _build_tree(arr):
    if not arr or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

def _tree_to_arr(root):
    if root is None:
        return []
    out = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out
`;

function pyLiteral(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLiteral).join(", ")}]`;
  return "None";
}

export function generatePython(metaData: ProblemMetaData, args: unknown[], userCode: string): string {
  const usesListNode = metaData.params.some((p) => p.type === "ListNode") || metaData.return.type === "ListNode";
  const usesTreeNode = metaData.params.some((p) => p.type === "TreeNode") || metaData.return.type === "TreeNode";

  const argExprs = metaData.params.map((param, i) => {
    const literal = pyLiteral(args[i]);
    if (param.type === "ListNode") return `_build_list(${literal})`;
    if (param.type === "TreeNode") return `_build_tree(${literal})`;
    return literal;
  });

  let printExpr = "result";
  if (metaData.return.type === "ListNode") printExpr = "_list_to_arr(result)";
  if (metaData.return.type === "TreeNode") printExpr = "_tree_to_arr(result)";

  return `
import json
import sys
sys.setrecursionlimit(10000)
${usesListNode ? LIST_NODE_HELPERS : ""}
${usesTreeNode ? TREE_NODE_HELPERS : ""}

${userCode}

if __name__ == "__main__":
    solution = Solution()
    result = solution.${metaData.name}(${argExprs.join(", ")})
    print(json.dumps(${printExpr}, separators=(",", ":")))
`.trim();
}
