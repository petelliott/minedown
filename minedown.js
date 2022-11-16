const page_width = 114;
const page_height = 14;

function reparse(parsed, off, until) {
    off = off ?? { v: 0 };

    if (off.v >= parsed.length)
        return [];

    const o = off.v;
    off.v++;

    if (parsed[o].type == until)
        return [];

    if (parsed[o].type === 'inline')
        return reparse(parsed[o].children).concat(reparse(parsed, off, until));

    if (parsed[o].type === 'text') {
        return parsed[o].content.trim().split(/\s+/).concat(reparse(parsed, off, until));
    }

    if (parsed[o].type.endsWith('_open')) {
        const tag = parsed[o].type.replace('_open', '');
        return [{
            tag: tag,
            children: reparse(parsed, off, tag + '_close')
        }].concat(reparse(parsed, off, until));
    }

    return [{
        tag: parsed[o].type,
    }].concat(reparse(parsed, off, until));
}

function glyphWidth(str) {
    let w = 0;
    for (const i in str) {
        w += glyph_sizes[str.charCodeAt(i)]
    }
    return w;
}

function pagebreak(pages, builder, state) {
    state.col = 0;
    state.line = 0;
    pages.push(builder.join(''));
    builder.length = 0;
}

function insert_string(str, pages, builder, state) {
    const w = glyphWidth(str);

    if (state.col + w > page_width) {
        state.col = 0;
        state.line++;
        builder.push('\n');
    }

    if (state.line >= page_height) {
        pagebreak(pages, builder, state);
    }

    builder.push(str);
    state.col += w;
}

function newline(pages, builder, state) {
    state.col = 0;
    state.line++;

    if (state.line >= page_height) {
        pagebreak(pages, builder, state);
    }

    builder.push('\n');
}

function freshline(pages, builder, state) {
    if (state.col !== 0) {
        newline(pages, builder, state);
    }
}

function _layoutBook(parsed, pages, builder, state) {
    for (const node of parsed) {
        if (typeof node === 'string') {
            if (state.col != 0 && glyphWidth(' ') + state.col < page_width)
                insert_string(' ', pages, builder, state);
            insert_string(node, pages, builder, state);
        } else if (node.tag === 'heading') {
            freshline(pages, builder, state);
            _layoutBook(node.children, pages, builder, state);
            freshline(pages, builder, state);
            insert_string("===================", pages, builder, state);
            freshline(pages, builder, state);
        } else if (node.tag === 'paragraph') {
            _layoutBook(node.children, pages, builder, state);
            freshline(pages, builder, state);
            newline(pages, builder, state);
        }
    }
}

function layoutBook(parsed) {
    const builder = [];
    const pages = [];
    _layoutBook(parsed, pages, builder, { line: 0, col: 0 });
    if (builder.length > 0)
        pages.push(builder.join(''));
    return pages;
}

let md = window.markdownit();

function minedown(text) {
    return layoutBook(reparse(md.parse(text)));
}
