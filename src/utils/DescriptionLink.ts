export function addDescriptionLink(text: string, link: string, extraWords: string, innerText: string): DocumentFragment {
    const frag = new DocumentFragment();
    const desc = document.createElement('span');
    desc.innerText = text + ' ';
    frag.appendChild(desc);

    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.innerText = innerText;
    frag.appendChild(anchor);

    const extra = document.createElement('span');
    extra.innerText = ' ' + extraWords;
    frag.appendChild(extra);

    return frag;
}