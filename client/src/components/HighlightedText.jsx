const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch',
  'case', 'break', 'continue', 'class', 'new', 'this', 'try', 'catch', 'finally',
  'throw', 'async', 'await', 'import', 'export', 'from', 'default', 'extends',
  'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'in', 'of', 'delete',
  'void', 'yield', 'static', 'get', 'set', 'public', 'private', 'protected',
  'interface', 'type', 'enum', 'implements', 'package', 'def', 'lambda', 'None',
  'True', 'False', 'and', 'or', 'not', 'elif', 'with', 'as', 'pass', 'raise', 'global'
]);

const BUILTINS = new Set([
  'console', 'log', 'window', 'document', 'Math', 'JSON', 'Object', 'Array', 'String',
  'Number', 'Boolean', 'Promise', 'Map', 'Set', 'Date', 'RegExp', 'Error', 'parseInt',
  'parseFloat', 'fetch', 'require', 'module', 'exports', 'process', 'print', 'len',
  'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple'
]);

// 匹配：中文词、英文标识符、数字、运算符、空白
const TOKEN_PATTERN = /([\u4e00-\u9fa5]+|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[()[\]{}.,;:+\-*/%=<>!&|?]+|\s+)/g;

export default function HighlightedText({
  text,
  forceHighlight = false,
  maxPrimary = 6,
  highlightAll = true
}) {
  const value = String(text || '');
  if (!value) return null;

  const parts = value
    .split(TOKEN_PATTERN)
    .filter((part) => part !== undefined && part !== null && part !== '');
  let primaryCount = 0;

  function classify(part) {
    if (/^\s+$/.test(part)) return 'plain';
    if (/^[\u4e00-\u9fa5]+$/.test(part)) return 'plain';
    if (KEYWORDS.has(part)) return 'primary';
    if (BUILTINS.has(part)) return 'primary';
    if (/^[A-Za-z_$][\w$]*$/.test(part)) {
      if (forceHighlight || highlightAll) return 'primary';
      return 'secondary';
    }
    if (/^\d/.test(part)) return 'secondary';
    return 'operator';
  }

  const rendered = [];
  parts.forEach((part, index) => {
    const kind = classify(part);
    if (kind === 'plain') {
      rendered.push(part);
      return;
    }
    if (kind === 'operator') {
      rendered.push(
        <span className="learning-token operator" key={index}>{part}</span>
      );
      return;
    }
    if (kind === 'primary') {
      if (primaryCount < maxPrimary) {
        primaryCount += 1;
        rendered.push(
          <mark className="learning-token primary" key={index}>{part}</mark>
        );
        return;
      }
      rendered.push(
        <mark className="learning-token secondary" key={index}>{part}</mark>
      );
      return;
    }
    rendered.push(
      <mark className="learning-token secondary" key={index}>{part}</mark>
    );
  });

  return rendered;
}
