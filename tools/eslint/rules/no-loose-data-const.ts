// @source-path [fobles] tools/eslint/rules/no-loose-data-const.ts

import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import type * as ts from "typescript";
import { AST_NODE_TYPES } from "@typescript-eslint/utils";

type MessageId = "looseDataConst";

type Options = [];

type DataCheck = { hasCallableType: (node: TSESTree.Node) => boolean; isData: (node: TSESTree.Node) => boolean };

const RULE = {
  ALLOWED_CALLS: ["Math.ceil", "Math.floor", "Math.max", "Math.min", "Math.round", "Math.trunc", "Object.freeze"],
  ALLOWED_CONSTRUCTORS: ["Map", "Set"],
  MESSAGE: "Data-only constants must be declared in .const.ts files.",
} as const;

function calleeName(callee: TSESTree.Node): string {
  let result = "";

  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    result = `${callee.object.name}.${callee.property.name}`;
  }

  return result;
}

function createTypeCheck(context: TSESLint.RuleContext<MessageId, Options>): DataCheck["hasCallableType"] {
  const services = context.sourceCode.parserServices;
  const nodeMap = services?.esTreeNodeToTSNodeMap;
  const checker = services?.program?.getTypeChecker();

  function hasCallableType(type: ts.Type, visited: Set<ts.Type>): boolean {
    let result = false;

    if (checker && !visited.has(type)) {
      visited.add(type);
      result = type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0;

      if (!result) {
        for (const property of type.getProperties()) {
          const declaration = property.valueDeclaration ?? property.declarations?.[0];

          if (declaration) {
            const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);

            if (hasCallableType(propertyType, visited)) {
              result = true;
              break;
            }
          }
        }
      }
    }

    return result;
  }

  return (node: TSESTree.Node): boolean => {
    let callable = false;

    if (checker && nodeMap) {
      const tsNode = nodeMap.get(node);
      const type = checker.getTypeAtLocation(tsNode);
      callable = hasCallableType(type, new Set<ts.Type>());
    }

    return callable;
  };
}

function isLeaf(node: TSESTree.Node, check: DataCheck): boolean {
  let result = false;

  if (node.type === AST_NODE_TYPES.Literal) {
    result = true;
  } else if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    result = node.expressions.every(check.isData);
  } else if (node.type === AST_NODE_TYPES.Identifier) {
    result = !check.hasCallableType(node);
  } else if (node.type === AST_NODE_TYPES.UnaryExpression) {
    result = node.operator !== "delete" && check.isData(node.argument);
  }

  return result;
}

function isMemberOwner(node: TSESTree.Node, check: DataCheck): boolean {
  let result: boolean;

  if (node.type === AST_NODE_TYPES.Identifier) {
    result = !check.hasCallableType(node);
  } else if (node.type === AST_NODE_TYPES.MemberExpression) {
    result =
      isMemberOwner(node.object, check) &&
      (!node.computed || check.isData(node.property)) &&
      !check.hasCallableType(node);
  } else {
    result = check.isData(node);
  }

  return result;
}

function isOperator(node: TSESTree.Node, check: DataCheck): boolean {
  let result = false;

  if (node.type === AST_NODE_TYPES.BinaryExpression || node.type === AST_NODE_TYPES.LogicalExpression) {
    result = check.isData(node.left) && check.isData(node.right);
  } else if (node.type === AST_NODE_TYPES.MemberExpression) {
    result =
      isMemberOwner(node.object, check) &&
      (!node.computed || check.isData(node.property)) &&
      !check.hasCallableType(node);
  }

  return result;
}

function isProperty(property: TSESTree.ObjectLiteralElement, check: DataCheck): boolean {
  let result:boolean;

  if (property.type === AST_NODE_TYPES.SpreadElement) {
    result = check.isData(property.argument);
  } else {
    result =
      property.kind === "init" &&
      !property.method &&
      (!property.computed || check.isData(property.key)) &&
      check.isData(property.value);
  }

  return result;
}

function isDataCollection(node: TSESTree.NewExpression, check: DataCheck): boolean {
  return (
    node.callee.type === AST_NODE_TYPES.Identifier &&
    RULE.ALLOWED_CONSTRUCTORS.includes(node.callee.name as (typeof RULE.ALLOWED_CONSTRUCTORS)[number]) &&
    node.arguments.every(check.isData)
  );
}

function isAllowedCall(node: TSESTree.CallExpression, check: DataCheck): boolean {
  return (
    !node.optional &&
    RULE.ALLOWED_CALLS.includes(calleeName(node.callee) as (typeof RULE.ALLOWED_CALLS)[number]) &&
    node.arguments.every(check.isData)
  );
}

function isStructure(node: TSESTree.Node, check: DataCheck): boolean {
  let result = false;

  if (node.type === AST_NODE_TYPES.ArrayExpression) {
    result = node.elements.every((element) => element === null || check.isData(element));
  } else if (node.type === AST_NODE_TYPES.ObjectExpression) {
    result = node.properties.every((property) => isProperty(property, check));
  } else if (node.type === AST_NODE_TYPES.NewExpression) {
    result = isDataCollection(node, check);
  } else if (node.type === AST_NODE_TYPES.CallExpression) {
    result = isAllowedCall(node, check);
  }

  return result;
}

function createDataCheck(context: TSESLint.RuleContext<MessageId, Options>): DataCheck {
  const check: DataCheck = { hasCallableType: createTypeCheck(context), isData: () => false };

  check.isData = (node: TSESTree.Node): boolean => {
    let result: boolean;

    if (
      node.type === AST_NODE_TYPES.TSAsExpression ||
      node.type === AST_NODE_TYPES.TSNonNullExpression ||
      node.type === AST_NODE_TYPES.TSSatisfiesExpression ||
      node.type === AST_NODE_TYPES.TSTypeAssertion
    ) {
      result = check.isData(node.expression);
    } else {
      result = isLeaf(node, check) || isOperator(node, check) || isStructure(node, check);
    }

    return result;
  };

  return check;
}

const noLooseDataConst: TSESLint.RuleModule<MessageId, Options> = {
  defaultOptions: [],
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require exported data-only constants to live in .const.ts files while leaving behavior-derived configuration with its owning behavior.",
    },
    schema: [],
    messages: { looseDataConst: RULE.MESSAGE },
  },
  create(context) {
    const check = createDataCheck(context);

    return {
      "Program > ExportNamedDeclaration > VariableDeclaration[kind='const'] > VariableDeclarator"(
        node: TSESTree.VariableDeclarator,
      ): void {
        if (!node.parent.declare && node.id.type === AST_NODE_TYPES.Identifier && node.init && check.isData(node.init)) {
          context.report({ node: node.id, messageId: "looseDataConst" });
        }
      },
    };
  },
};

export default noLooseDataConst;
