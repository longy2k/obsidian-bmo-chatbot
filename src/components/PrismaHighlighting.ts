import { loadPrism } from 'obsidian';

// Handle Prisma Highlighting for code blocks
export function prismHighlighting(messageBlock: { querySelectorAll: (arg0: string) => NodeListOf<HTMLElement>; }) {
    loadPrism().then((Prism) => {
        const codeBlocks = messageBlock?.querySelectorAll('.messageBlock pre code');

        codeBlocks?.forEach((codeBlock: HTMLElement) => {
            const language = codeBlock.className.replace('language-', '');
            const code = codeBlock.textContent;
            
            if (language && Prism.languages[language]) {
                const highlightedCode = Prism.highlight(code, Prism.languages[language]);
                codeBlock.innerHTML = highlightedCode;
            }
        });
    });
}