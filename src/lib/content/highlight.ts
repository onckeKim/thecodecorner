/**
 * Tiny syntax highlighter producing the token classes defined in design/components.css
 * (.k keyword, .s string, .n number, .f function, .c comment). Ported from the prototype.
 */
export type Token = { text: string; kind?: "k" | "s" | "n" | "f" | "c" };

const SQL_KEYWORDS =
  "SELECT|FROM|WHERE|AND|OR|NOT|NULL|IS|IN|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|GROUP|BY|ORDER|HAVING|LIMIT|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|DESC|ASC|OVER|PARTITION|WITH|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|BETWEEN|LIKE";
const DAX_KEYWORDS = "VAR|RETURN|TRUE|FALSE";
const M_KEYWORDS = "let|in|each|if|then|else|type";

function keywordsFor(language: string): string {
  switch (language.toLowerCase()) {
    case "sql":
      return SQL_KEYWORDS;
    case "dax":
      return DAX_KEYWORDS;
    case "m":
    case "powerquery":
      return M_KEYWORDS;
    default:
      return "TRUE|FALSE";
  }
}

export function highlight(code: string, language: string): Token[] {
  const re = new RegExp(
    "(--[^\\n]*|//[^\\n]*)" + // comment
      "|('[^'\\n]*'|\"[^\"\\n]*\")" + // string
      "|\\b(" + keywordsFor(language) + ")\\b" + // keyword
      "|\\b([A-Za-z][A-Za-z0-9_.]*)(?=\\s*\\()" + // function call
      "|\\b(\\d+(?:\\.\\d+)?)\\b", // number
    "g",
  );
  const tokens: Token[] = [];
  let last = 0;
  for (const m of code.matchAll(re)) {
    const index = m.index ?? 0;
    if (index > last) tokens.push({ text: code.slice(last, index) });
    const kind = m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : m[4] ? "f" : "n";
    tokens.push({ text: m[0], kind });
    last = index + m[0].length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last) });
  return tokens;
}
