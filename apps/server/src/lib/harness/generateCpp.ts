import type { ProblemMetaData } from "../../types/index.js";

const LIST_NODE_HELPERS = `
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

ListNode* _buildList(vector<int> arr) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    for (int v : arr) {
        tail->next = new ListNode(v);
        tail = tail->next;
    }
    return dummy.next;
}

vector<int> _listToArr(ListNode* node) {
    vector<int> out;
    while (node != nullptr) {
        out.push_back(node->val);
        node = node->next;
    }
    return out;
}
`;

const TREE_NODE_HELPERS = `
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

TreeNode* _buildTree(vector<optional<int>> arr) {
    if (arr.empty() || !arr[0].has_value()) return nullptr;
    TreeNode* root = new TreeNode(arr[0].value());
    queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < arr.size()) {
        TreeNode* node = q.front(); q.pop();
        if (i < arr.size() && arr[i].has_value()) {
            node->left = new TreeNode(arr[i].value());
            q.push(node->left);
        }
        i++;
        if (i < arr.size() && arr[i].has_value()) {
            node->right = new TreeNode(arr[i].value());
            q.push(node->right);
        }
        i++;
    }
    return root;
}

string _treeToArrJson(TreeNode* root) {
    if (root == nullptr) return "[]";
    vector<string> parts;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front(); q.pop();
        if (node == nullptr) {
            parts.push_back("null");
        } else {
            parts.push_back(to_string(node->val));
            q.push(node->left);
            q.push(node->right);
        }
    }
    while (!parts.empty() && parts.back() == "null") parts.pop_back();
    string out = "[";
    for (size_t i = 0; i < parts.size(); i++) {
        out += parts[i];
        if (i + 1 < parts.size()) out += ",";
    }
    out += "]";
    return out;
}
`;

const TO_JSON_HELPERS = `
string _toJson(int v) { return to_string(v); }
string _toJson(long long v) { return to_string(v); }
string _toJson(double v) {
    ostringstream oss;
    oss << v;
    return oss.str();
}
string _toJson(bool v) { return v ? "true" : "false"; }
string _toJson(const string& v) { return "\\"" + v + "\\""; }
string _toJson(char v) { return string("\\"") + v + "\\""; }
template <typename T>
string _toJson(const vector<T>& v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); i++) {
        out += _toJson(v[i]);
        if (i + 1 < v.size()) out += ",";
    }
    out += "]";
    return out;
}
`;

function cppType(type: string): string {
  switch (type) {
    case "integer": return "int";
    case "long": return "long long";
    case "double": return "double";
    case "boolean": return "bool";
    case "string": return "string";
    case "character": return "char";
    case "integer[]": return "vector<int>";
    case "long[]": return "vector<long long>";
    case "double[]": return "vector<double>";
    case "string[]": return "vector<string>";
    case "character[]": return "vector<char>";
    case "integer[][]": return "vector<vector<int>>";
    case "string[][]": return "vector<vector<string>>";
    case "ListNode": return "ListNode*";
    case "TreeNode": return "TreeNode*";
    default: throw new Error(`Unsupported C++ type: ${type}`);
  }
}

function cppLiteral(value: unknown, type: string): string {
  if (type === "integer" || type === "long") return String(value);
  if (type === "double") return String(value);
  if (type === "boolean") return value ? "true" : "false";
  if (type === "string") return JSON.stringify(value);
  if (type === "character") return `'${String(value)}'`;
  if (type === "integer[]" || type === "long[]" || type === "double[]") {
    return `{${(value as unknown[]).map((v) => String(v)).join(", ")}}`;
  }
  if (type === "string[]") {
    return `{${(value as unknown[]).map((v) => JSON.stringify(v)).join(", ")}}`;
  }
  if (type === "character[]") {
    return `{${(value as unknown[]).map((v) => `'${String(v)}'`).join(", ")}}`;
  }
  if (type === "integer[][]") {
    return `{${(value as unknown[][]).map((row) => `{${row.map((v) => String(v)).join(", ")}}`).join(", ")}}`;
  }
  if (type === "string[][]") {
    return `{${(value as unknown[][]).map((row) => `{${row.map((v) => JSON.stringify(v)).join(", ")}}`).join(", ")}}`;
  }
  throw new Error(`Unsupported C++ literal type: ${type}`);
}

export function generateCpp(metaData: ProblemMetaData, args: unknown[], userCode: string): string {
  const usesListNode = metaData.params.some((p) => p.type === "ListNode") || metaData.return.type === "ListNode";
  const usesTreeNode = metaData.params.some((p) => p.type === "TreeNode") || metaData.return.type === "TreeNode";

  // IMPORTANT: LeetCode's C++ templates commonly take non-const reference
  // params (e.g. `vector<int>& nums`), which cannot bind to a temporary
  // (an inline brace-init literal passed directly as an argument). So we
  // declare a named local variable per argument first - a named variable
  // is an lvalue and binds correctly to const-ref, non-const-ref, and
  // by-value parameters alike.
  const argDecls: string[] = [];
  const argNames: string[] = [];

  metaData.params.forEach((param, i) => {
    const varName = `arg${i}`;
    argNames.push(varName);

    if (param.type === "ListNode") {
      const arr = args[i] as unknown[];
      argDecls.push(`    ListNode* ${varName} = _buildList({${arr.map((v) => String(v)).join(", ")}});`);
    } else if (param.type === "TreeNode") {
      const arr = args[i] as (number | null)[];
      const items = arr.map((v) => (v === null ? "nullopt" : `optional<int>(${v})`)).join(", ");
      argDecls.push(`    TreeNode* ${varName} = _buildTree({${items}});`);
    } else {
      argDecls.push(`    ${cppType(param.type)} ${varName} = ${cppLiteral(args[i], param.type)};`);
    }
  });

  const callExpr = `solution.${metaData.name}(${argNames.join(", ")})`;

  let printStatement: string;
  if (metaData.return.type === "ListNode") {
    printStatement = `cout << _toJson(_listToArr(result)) << endl;`;
  } else if (metaData.return.type === "TreeNode") {
    printStatement = `cout << _treeToArrJson(result) << endl;`;
  } else {
    printStatement = `cout << _toJson(result) << endl;`;
  }

  return `
#include <bits/stdc++.h>
using namespace std;
${TO_JSON_HELPERS}
${usesListNode ? LIST_NODE_HELPERS : ""}
${usesTreeNode ? TREE_NODE_HELPERS : ""}

${userCode}

int main() {
    Solution solution;
${argDecls.join("\n")}
    auto result = ${callExpr};
    ${printStatement}
    return 0;
}
`.trim();
}
