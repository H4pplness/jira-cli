'use strict';

function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) {
    const sep = ['paragraph','heading','listItem','bulletList','orderedList','blockquote','codeBlock'].includes(node.type) ? '\n' : '';
    return node.content.map(adfToText).join(sep);
  }
  return '';
}

module.exports = { adfToText };
