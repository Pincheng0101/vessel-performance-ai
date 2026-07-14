const SCROLL_TO_ANCHOR_TOP_OFFSET = 64 + 16;

export const useMarkdownViewer = () => {
  const routeStore = useRouteStore();

  const initAnchors = (container) => {
    container.querySelectorAll('.anchor').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = anchor.getAttribute('href');
        scrollToAnchor(hash);
      });
    });
  };

  const scrollToAnchor = (hash) => {
    if (!hash) return;
    routeStore.setHash(hash);
    scrollUtils.scrollToElementById(hash, SCROLL_TO_ANCHOR_TOP_OFFSET);
    routeStore.updateHistoryHash(hash);
  };

  const processTocList = (ul) => {
    if (!ul) return [];
    const listItems = ul.querySelectorAll(':scope > li');
    return Array.from(listItems).reduce((items, li) => {
      const link = li.querySelector(':scope > a');
      const nestedUl = li.querySelector(':scope > ul');
      if (link) {
        items.push({
          text: link.textContent,
          href: link.getAttribute('href'),
          children: nestedUl ? processTocList(nestedUl) : [],
        });
      }
      return items;
    }, []);
  };

  return {
    initAnchors,
    scrollToAnchor,
    processTocList,
  };
};
