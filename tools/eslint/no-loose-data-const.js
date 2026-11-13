// @source-path [fobles] tools/eslint/no-loose-data-const.js
const RULE = {
  ALLOWED_CALLS: [
    "Math.ceil",
    "Math.floor",
    "Math.max",
    "Math.min",
    "Math.round",
    "Math.trunc",
    "Object.freeze",
  ],
  ALLOWED_CONSTRUCTORS: ["Map", "Set"],
  MESSAGE: "Data-only constants must be declared in .const.ts files.",
  WRAPPER_TYPES: ["TSAsExpression", "TSNonNullExpression", "TSSatisfiesExpression", "TSTypeAssertion"],
};

function calleeName(callee) {
  const member =
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    callee.property.type === "Identifier";
  return member ? `${callee.object.name}.${callee.property.name}` : "";
}

function createTypeCheck(context) {
  const services = context.sourceCode.parserServices;
  const ready = !!services?.program && !!services.esTreeNodeToTSNodeMap;
  const checker = ready ? services.program.getTypeChecker() : undefined;
  return (node) => {
    let callable = false;
    if (checker) {
      const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));
      callable = type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0;
    }
    return callable;
  };
}

function isLeaf(node, check) {
  let result = false;
  if (node.type === "Literal") result = true;
  else if (node.type === "TemplateLiteral") result = node.expressions.every(check.isData);
  else if (node.type === "Identifier") result = !check.isCallable(node);
  else if (node.type === "UnaryExpression") result = node.operator !== "delete" && check.isData(node.argument);
  return result;
}

function isOperator(node, check) {
  let result = false;
  if (node.type === "BinaryExpression" || node.type === "LogicalExpression")
    result = check.isData(node.left) && check.isData(node.right);
  else if (node.type === "MemberExpression")
    result =
      isMemberOwner(node.object, check) &&
      (!node.computed || check.isData(node.property)) &&
      !check.isCallable(node);
  return result;
}

function isMemberOwner(node, check) {
  let result;
  if (node.type === "Identifier") result = true;
  else if (node.type === "MemberExpression")
    result = isMemberOwner(node.object, check) && (!node.computed || check.isData(node.property));
  else result = check.isData(node);
  return result;
}

function isProperty(property, check) {
  return property.type === "SpreadElement"
    ? check.isData(property.argument)
    : property.kind === "init" &&
        !property.method &&
        (!property.computed || check.isData(property.key)) &&
        check.isData(property.value);
}

function isStructure(node, check) {
  let result = false;
  if (node.type === "ArrayExpression")
    result = node.elements.every(
      (element) => element === null || check.isData(element.type === "SpreadElement" ? element.argument : element),
    );
  else if (node.type === "ObjectExpression") result = node.properties.every((p) => isProperty(p, check));
  else if (node.type === "NewExpression") result = isDataCollection(node, check);
  else if (node.type === "CallExpression")
    result =
      !node.optional &&
      RULE.ALLOWED_CALLS.includes(calleeName(node.callee)) &&
      node.arguments.every(check.isData);
  return result;
}

function isDataCollection(node, check) {
  return (
    node.callee.type === "Identifier" &&
    RULE.ALLOWED_CONSTRUCTORS.includes(node.callee.name) &&
    node.arguments.every(check.isData)
  );
}

function createDataCheck(context) {
  const check = { isCallable: createTypeCheck(context) };
  check.isData = (node) =>
    RULE.WRAPPER_TYPES.includes(node.type)
      ? check.isData(node.expression)
      : isLeaf(node, check) || isOperator(node, check) || isStructure(node, check);
  return check;
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require exported data-only constants (no functions, calls, instances or callable values) to live in .const.ts files.",
    },
    schema: [],
    messages: { looseDataConst: RULE.MESSAGE },
  },
  create(context) {
    const check = createDataCheck(context);
    return {
      "Program > ExportNamedDeclaration > VariableDeclaration[kind='const'] > VariableDeclarator"(node) {
        if (!node.parent.declare && node.id.type === "Identifier" && node.init && check.isData(node.init))
          context.report({ node: node.id, messageId: "looseDataConst" });
      },
    };
  },
};
