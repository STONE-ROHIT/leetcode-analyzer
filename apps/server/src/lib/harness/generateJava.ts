import type { ProblemMetaData } from "../../types/index.js";

const NODE_HELPERS = `
class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val; this.left = left; this.right = right;
    }
}
`;

const HELPER_METHODS = `
    static ListNode buildList(int[] arr) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        for (int v : arr) {
            tail.next = new ListNode(v);
            tail = tail.next;
        }
        return dummy.next;
    }

    static int[] listToArr(ListNode node) {
        List<Integer> out = new ArrayList<>();
        while (node != null) {
            out.add(node.val);
            node = node.next;
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < arr.length; i++) arr[i] = out.get(i);
        return arr;
    }

    static TreeNode buildTree(Integer[] arr) {
        if (arr.length == 0 || arr[0] == null) return null;
        TreeNode root = new TreeNode(arr[0]);
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < arr.length) {
            TreeNode node = queue.poll();
            if (i < arr.length && arr[i] != null) {
                node.left = new TreeNode(arr[i]);
                queue.add(node.left);
            }
            i++;
            if (i < arr.length && arr[i] != null) {
                node.right = new TreeNode(arr[i]);
                queue.add(node.right);
            }
            i++;
        }
        return root;
    }

    static String treeToArrJson(TreeNode root) {
        if (root == null) return "[]";
        List<String> parts = new ArrayList<>();
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node == null) {
                parts.add("null");
            } else {
                parts.add(String.valueOf(node.val));
                queue.add(node.left);
                queue.add(node.right);
            }
        }
        while (!parts.isEmpty() && parts.get(parts.size() - 1).equals("null")) {
            parts.remove(parts.size() - 1);
        }
        return "[" + String.join(",", parts) + "]";
    }

    static String toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof Integer || o instanceof Long || o instanceof Double || o instanceof Boolean) {
            return o.toString();
        }
        if (o instanceof String) return "\\"" + o + "\\"";
        if (o instanceof Character) return "\\"" + o + "\\"";
        if (o instanceof int[]) {
            int[] a = (int[]) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { sb.append(a[i]); if (i + 1 < a.length) sb.append(","); }
            return sb.append("]").toString();
        }
        if (o instanceof long[]) {
            long[] a = (long[]) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { sb.append(a[i]); if (i + 1 < a.length) sb.append(","); }
            return sb.append("]").toString();
        }
        if (o instanceof double[]) {
            double[] a = (double[]) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { sb.append(a[i]); if (i + 1 < a.length) sb.append(","); }
            return sb.append("]").toString();
        }
        if (o instanceof boolean[]) {
            boolean[] a = (boolean[]) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { sb.append(a[i]); if (i + 1 < a.length) sb.append(","); }
            return sb.append("]").toString();
        }
        if (o instanceof String[]) {
            String[] a = (String[]) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { sb.append("\\"").append(a[i]).append("\\""); if (i + 1 < a.length) sb.append(","); }
            return sb.append("]").toString();
        }
        if (o instanceof int[][]) {
            int[][] a = (int[][]) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { sb.append(toJson(a[i])); if (i + 1 < a.length) sb.append(","); }
            return sb.append("]").toString();
        }
        if (o instanceof String[][]) {
            String[][] a = (String[][]) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { sb.append(toJson(a[i])); if (i + 1 < a.length) sb.append(","); }
            return sb.append("]").toString();
        }
        if (o instanceof List) {
            List<?> list = (List<?>) o;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) { sb.append(toJson(list.get(i))); if (i + 1 < list.size()) sb.append(","); }
            return sb.append("]").toString();
        }
        return o.toString();
    }
`;

function javaType(type: string): string {
  switch (type) {
    case "integer": return "int";
    case "long": return "long";
    case "double": return "double";
    case "boolean": return "boolean";
    case "string": return "String";
    case "character": return "char";
    case "integer[]": return "int[]";
    case "long[]": return "long[]";
    case "double[]": return "double[]";
    case "string[]": return "String[]";
    case "character[]": return "char[]";
    case "integer[][]": return "int[][]";
    case "string[][]": return "String[][]";
    case "ListNode": return "ListNode";
    case "TreeNode": return "TreeNode";
    default: throw new Error(`Unsupported Java type: ${type}`);
  }
}

function javaLiteral(value: unknown, type: string): string {
  if (type === "integer" || type === "long") return String(value);
  if (type === "double") return `${value}d`;
  if (type === "boolean") return value ? "true" : "false";
  if (type === "string") return JSON.stringify(value);
  if (type === "character") return `'${String(value)}'`;
  if (type === "integer[]") return `new int[]{${(value as unknown[]).join(", ")}}`;
  if (type === "long[]") return `new long[]{${(value as unknown[]).map((v) => `${v}L`).join(", ")}}`;
  if (type === "double[]") return `new double[]{${(value as unknown[]).map((v) => `${v}d`).join(", ")}}`;
  if (type === "string[]") return `new String[]{${(value as unknown[]).map((v) => JSON.stringify(v)).join(", ")}}`;
  if (type === "character[]") return `new char[]{${(value as unknown[]).map((v) => `'${v}'`).join(", ")}}`;
  if (type === "integer[][]") {
    const rows = (value as unknown[][]).map((row) => `{${row.join(", ")}}`);
    return `new int[][]{${rows.join(", ")}}`;
  }
  if (type === "string[][]") {
    const rows = (value as unknown[][]).map((row) => `{${row.map((v) => JSON.stringify(v)).join(", ")}}`);
    return `new String[][]{${rows.join(", ")}}`;
  }
  throw new Error(`Unsupported Java literal type: ${type}`);
}

export function generateJava(metaData: ProblemMetaData, args: unknown[], userCode: string): string {
  const argExprs = metaData.params.map((param, i) => {
    if (param.type === "ListNode") {
      const arr = args[i] as unknown[];
      return `Main.buildList(new int[]{${arr.join(", ")}})`;
    }
    if (param.type === "TreeNode") {
      const arr = args[i] as (number | null)[];
      const items = arr.map((v) => (v === null ? "null" : String(v))).join(", ");
      return `Main.buildTree(new Integer[]{${items}})`;
    }
    return javaLiteral(args[i], param.type);
  });

  let printStatement: string;
  if (metaData.return.type === "ListNode") {
    printStatement = `System.out.println(toJson(listToArr(result)));`;
  } else if (metaData.return.type === "TreeNode") {
    printStatement = `System.out.println(treeToArrJson(result));`;
  } else {
    printStatement = `System.out.println(toJson(result));`;
  }

  return `
import java.util.*;
${NODE_HELPERS}

${userCode}

public class Main {
${HELPER_METHODS}
    public static void main(String[] args) {
        Solution solution = new Solution();
        ${javaType(metaData.return.type)} result = solution.${metaData.name}(${argExprs.join(", ")});
        ${printStatement}
    }
}
`.trim();
}
