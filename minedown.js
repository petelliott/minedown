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
        const type = parsed[o].type.replace('_open', '');
        return [{
            type: type,
            tag: parsed[o].tag,
            children: reparse(parsed, off, type + '_close')
        }].concat(reparse(parsed, off, until));
    }

    return [{
        type: parsed[o].type,
        tag: parsed[o].tag,
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

function freshpage(pages, builder, state) {
    if (state.col !== 0 || state.line !== 0) {
        pagebreak(pages, builder, state);
    }
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

function runBytecode(parsed, bc, config, pages, builder, state) {
    for (const op of bc) {
        if (op == 'pagebreak') {
            pagebreak(pages, builder, state);
        } else if (op == 'freshpage') {
            freshpage(pages, builder, state);
        } else if (op == 'vcenter') {
            if (state.line > 6) {
                pagebreak(pages, builder, state);
            }

            for (; state.line < 6;) {
                newline(pages, builder, state);
            }
        } else if (op == 'hcenter') {
            const newstate = { ... state };
            _layoutBook(parsed, config, [], [], newstate);
            const pad = (page_width - (newstate.col - state.col))/(2 * glyphWidth(' '));
            console.log(pad);
            for (let i = 0; i < pad; ++i) {
                console.log('a');
                insert_string(' ', pages, builder, state);
            }
        } else if (op == 'capson') {
            state.caps = true;
        } else if (op == 'capsoff') {
            state.caps = false;
        } else if (op == 'underline') {
            freshline(pages, builder, state);
            insert_string('===================', pages, builder, state);
            freshline(pages, builder, state);
        } else if (op == 'freshline') {
            freshline(pages, builder, state);
        } else if (op == 'newline') {
            newline(pages, builder, state);
        } else if (op == 'emit') {
            _layoutBook(parsed, config, pages, builder, state);
        }
    }
}

function _layoutBook(parsed, config, pages, builder, state) {
    for (const node of parsed) {
        if (typeof node === 'string') {
            if (state.col != 0 && glyphWidth(' ') + state.col < page_width)
                insert_string(' ', pages, builder, state);
            const str = (state.caps)? node.toUpperCase() : node;
            insert_string(str, pages, builder, state);
        } else if (config[node.tag]) {
            runBytecode(node.children, config[node.tag], config, pages, builder, state);
        }
    }
}

const default_config = {
    h1: ['freshpage', 'vcenter', 'capson', 'hcenter', 'emit', 'capsoff', 'pagebreak'],
    h2: ['freshpage', 'capson', 'hcenter', 'emit', 'capsoff', 'underline', 'freshline'],
    h3: ['capson', 'emit', 'capsoff', 'underline'],
    h4: ['emit', 'underline'],
    h5: ['capson', 'emit', 'capsoff', 'freshline', 'newline'],
    p:  ['emit', 'freshline', 'newline'],
    hr: ['pagebreak']
};

function layoutBook(parsed, config) {
    const builder = [];
    const pages = [];
    _layoutBook(parsed, { ...config, ...default_config }, pages, builder, { line: 0, col: 0, caps: false });
    if (builder.length > 0)
        pages.push(builder.join(''));
    return pages;
}

let md = window.markdownit();

function minedown(text, config) {
    return layoutBook(reparse(md.parse(text)), config);
}
