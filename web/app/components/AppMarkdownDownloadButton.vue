<script setup>
import html2pdf from 'html2pdf.js';

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    default: '',
  },
});

const state = reactive({
  isDownloading: false,
});

const PAGE_WIDTH = 794; // A4 width in pixels at 96 DPI
const PAGE_HEIGHT = 1123; // A4 height in pixels at 96 DPI
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 60;
const PAGE_PADDING = 36;
const USABLE_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - PAGE_PADDING * 2;
const HEADER_PADDING_LEFT = 16;
const LOGO_IMAGE_WIDTH = 28;
const LOGO_IMAGE_MARGIN = 8;
const HEADER_TEXT_ELLIPSIS_WIDTH = 24;

const convertImagesToBase64OrLink = async (container) => {
  const images = Array.from(container.querySelectorAll('img'));
  for (const img of images) {
    const src = img.getAttribute('src');

    if (!src || src.startsWith('data:image/')) continue;

    const result = await fileUtils.urlToBase64(src);

    if (typeof result === 'string' && result.startsWith('data:image/')) {
      img.setAttribute('src', result);
      continue;
    }
    const span = document.createElement('span');
    const link = document.createElement('a');
    link.href = src;
    link.textContent = src;
    link.target = '_blank';
    span.appendChild(link);

    img.replaceWith(span);
  }
};

const fitImagesSize = (container) => {
  const images = Array.from(container.querySelectorAll('img'));
  for (const img of images) {
    const width = elementUtils.getWidth(img);
    const height = elementUtils.getHeight(img);

    // If the image is larger than the usable height, scale it down
    if (height > USABLE_HEIGHT) {
      const scale = USABLE_HEIGHT / height;
      img.style.width = `${width * scale}px`;
      img.style.height = `${height * scale}px`;
      continue;
    }
    // Ensure it fits within the page width
    if (width > PAGE_WIDTH - PAGE_PADDING * 2) {
      img.style.width = '100%';
      img.style.height = 'auto';
    }
  }
};

const createPageWrapper = () => {
  const page = document.createElement('div');
  page.className = 'pdf-page';

  // Header
  const header = document.createElement('div');
  header.className = 'pdf-header';

  const headerImg = document.createElement('img');
  headerImg.src = '/images/logos/hq-brandmark-light.png';
  headerImg.alt = 'Headquarter.ai';
  headerImg.style.width = '28px';

  const headerText = document.createElement('p');
  headerText.textContent = props.fileName;
  headerText.classList.add('title');

  const tempHeaderText = document.createElement('p');
  tempHeaderText.style.visibility = 'hidden';
  tempHeaderText.style.position = 'absolute';
  tempHeaderText.textContent = props.fileName;
  document.body.appendChild(tempHeaderText);
  const headerTextWidth = elementUtils.getWidth(tempHeaderText);
  document.body.removeChild(tempHeaderText);

  header.appendChild(headerImg);
  header.appendChild(headerText);
  const headerTextMaxWidth = PAGE_WIDTH - PAGE_PADDING * 2 - HEADER_PADDING_LEFT - LOGO_IMAGE_WIDTH - LOGO_IMAGE_MARGIN - HEADER_TEXT_ELLIPSIS_WIDTH;
  if (headerTextWidth > headerTextMaxWidth) {
    const headerEllipsis = document.createElement('p');
    headerEllipsis.textContent = '...';
    headerEllipsis.classList.add('ellipsis');
    header.appendChild(headerEllipsis);
  }

  // Content
  const content = document.createElement('div');
  content.className = 'pdf-content';

  // Footer
  const footer = document.createElement('div');
  footer.className = 'pdf-footer';

  const footerText = document.createElement('span');
  footerText.innerHTML = `&copy; ${(new Date()).getFullYear()} Headquarter.ai`;

  footer.appendChild(footerText);

  // Assemble
  page.appendChild(header);
  page.appendChild(content);
  page.appendChild(footer);

  return page;
};

const createPageBreak = () => {
  const breakElement = document.createElement('div');
  breakElement.classList.add('page-break');
  return breakElement;
};

const insertPageBreakBefore = (el) => {
  const breakElement = createPageBreak();
  if (!el || !el.parentNode) return;
  el.parentNode.insertBefore(breakElement, el);
};

const createTempContainer = (width) => {
  const temp = document.createElement('div');
  temp.style.visibility = 'hidden';
  temp.style.position = 'absolute';
  temp.style.width = `${width}px`;
  return temp;
};

const isHeading = el => /^H[1-6]$/.test(el.tagName);

const getHeadingGroups = (container) => {
  const groups = [];
  let currentGroup = [];
  const headingIncludedInPreviousGroup = new Set();
  const children = Array.from(container.children);

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    // Start a new group if the element is a heading
    if (isHeading(el)) {
      if (!headingIncludedInPreviousGroup.has(el)) {
        // If the current group has content, push it to groups
        if (currentGroup.length > 0 && hasContent(currentGroup)) {
          groups.push(currentGroup);
          currentGroup
            .filter(e => isHeading(e))
            .forEach(e => headingIncludedInPreviousGroup.add(e));
          currentGroup = [];
        }
        currentGroup.push(el);
      }
      continue;
    }
    currentGroup.push(el);
  }
  if (currentGroup.length > 0 && hasContent(currentGroup)) {
    groups.push(currentGroup);
  }
  return groups;
};

const hasContent = group => group.some(el => (['P', 'UL', 'TABLE', 'PRE'].includes(el.tagName)));

const getMarginBetweenElements = (prevEl, currEl) => {
  const prevMarginBottom = elementUtils.getMarginBottom(prevEl);
  const currMarginTop = elementUtils.getMarginTop(currEl);
  // Handle margin collapse between elements
  return Math.max(prevMarginBottom, currMarginTop);
};

const getGroupHeight = (group) => {
  let totalHeight = 0;

  for (let i = 0; i < group.length; i++) {
    const el = group[i];
    const height = elementUtils.getHeight(el);
    const marginBottom = elementUtils.getMarginBottom(el);

    totalHeight += height;

    // Add margin-bottom for the last element in the group
    if (i === group.length - 1) {
      totalHeight += marginBottom;
    }

    if (i === 0) {
      continue;
    }
    const prevEl = group[i - 1];
    totalHeight += getMarginBetweenElements(prevEl, el);
  }

  return totalHeight;
};

const insertSplitTablesWithBreaks = (originalTable, tables) => {
  const fragment = document.createDocumentFragment();

  tables.forEach((t, i) => {
    if (i > 0) {
      const breakElement = createPageBreak();
      fragment.appendChild(breakElement);
    }
    fragment.appendChild(t);
  });

  originalTable.parentNode.replaceChild(fragment, originalTable);
};

const createTable = (thead) => {
  if (!thead) return;
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(thead.cloneNode(true));
  table.appendChild(tbody);
  return table;
};

const splitTableToFitPage = (table, currentHeight) => {
  const originalThead = table.querySelector('thead');
  const originalTbody = table.querySelector('tbody') || table;
  const rows = Array.from(originalTbody.rows);

  const tables = [];
  let newTable = createTable(originalThead);
  let tbody = newTable.querySelector('tbody');
  let accumulatedHeight = currentHeight;

  for (const row of rows) {
    const rowHeight = elementUtils.getHeight(row);

    if (rowHeight > USABLE_HEIGHT) {
      return { longContentElement: row };
    }

    let theadHeight = 0;
    if (tbody.rows.length === 0 && originalThead) {
      theadHeight = elementUtils.getHeight(originalThead);
    }

    if (accumulatedHeight + theadHeight + rowHeight > USABLE_HEIGHT && tbody.rows.length > 0) {
      tables.push(newTable);
      newTable = createTable(originalThead);
      tbody = newTable.querySelector('tbody');
      accumulatedHeight = 0;
      theadHeight = originalThead ? elementUtils.getHeight(originalThead) : 0;
    }

    accumulatedHeight += (tbody.rows.length === 0 ? theadHeight : 0) + rowHeight;
    tbody.appendChild(row.cloneNode(true));
  }

  if (tbody.rows.length > 0) {
    tables.push(newTable);
  }

  insertSplitTablesWithBreaks(table, tables);
  return tables;
};

const insertSplitUlsWithBreaks = (originalUl, uls) => {
  const fragment = document.createDocumentFragment();

  uls.forEach((ul, i) => {
    if (i > 0) {
      const breakElement = createPageBreak();
      fragment.appendChild(breakElement);
    }
    fragment.appendChild(ul);
  });

  originalUl.parentNode.replaceChild(fragment, originalUl);
};

const createUl = (originalUl) => {
  const ul = document.createElement('ul');
  ul.className = originalUl.className;
  ul.style.cssText = originalUl.style.cssText;
  return ul;
};

const splitUlToFitPage = (ul, currentHeight) => {
  const items = Array.from(ul.children);
  const uls = [];
  let newUl = createUl(ul);
  let accumulatedHeight = currentHeight;

  for (const li of items) {
    const children = Array.from(li.children);
    if (children.length > 1) {
      // Remove images from li if it has multiple children
      removeImages(li);
    }
    const liClone = li.cloneNode(true);

    // Create a temporary container to measure height
    const originalWidth = elementUtils.getWidth(li);
    const tempContainer = createTempContainer(originalWidth - PAGE_PADDING * 2);
    tempContainer.appendChild(liClone);
    document.body.appendChild(tempContainer);
    const liHeight = elementUtils.getHeight(liClone);
    const liMarginBottom = elementUtils.getMarginBottom(li);

    document.body.removeChild(tempContainer);

    if (liHeight > USABLE_HEIGHT) {
      const newLis = splitElementTextToFitPage(li, accumulatedHeight);
      if (!newLis || newLis.length === 0) {
        return {
          longContentElement: li,
        };
      }

      for (const newLi of newLis) {
        const tempUl = createUl(ul);
        tempUl.appendChild(newLi.cloneNode(true));
        const originalWidth = elementUtils.getWidth(newLi);
        const tempContainer = createTempContainer(originalWidth - PAGE_PADDING * 2);
        tempContainer.appendChild(tempUl);
        document.body.appendChild(tempContainer);
        const newLiHeight = elementUtils.getHeight(tempUl);
        document.body.removeChild(tempContainer);

        if (accumulatedHeight + newLiHeight > USABLE_HEIGHT && Array.from(newUl.children).length > 0) {
          uls.push(newUl);
          newUl = createUl(ul);
          accumulatedHeight = 0;
        }

        newUl.appendChild(newLi.cloneNode(true));
        accumulatedHeight += newLiHeight + liMarginBottom;
      }
      continue;
    }
    if (accumulatedHeight + liHeight > USABLE_HEIGHT && Array.from(newUl.children).length > 0) {
      uls.push(newUl);
      newUl = createUl(ul);
      accumulatedHeight = 0;
    }

    newUl.appendChild(li.cloneNode(true));
    accumulatedHeight += liHeight + liMarginBottom;
  }

  if (Array.from(newUl.children).length > 0) {
    uls.push(newUl);
  }

  insertSplitUlsWithBreaks(ul, uls);
  return uls;
};

const removeImages = (el) => {
  const images = el.querySelectorAll('img');
  images.forEach((img) => {
    const parent = img.parentNode;
    parent.removeChild(img);
  });
};

const splitElementTextToFitPage = (el, currentHeight) => {
  const text = el.textContent.trim();
  if (!text) return [];

  const container = el.parentNode;

  const originalWidth = elementUtils.getWidth(el);
  const tempContainer = createTempContainer(originalWidth - PAGE_PADDING * 2);
  container.appendChild(tempContainer);

  const punctuationChars = ', . ! ? ; :' // English punctuation
    + '，。！？；：、' // Chinese punctuation
    + '\\[\\]\\(\\)\\{\\}' // Brackets: [], (), {}
    + '「」『』“”‘’'; // Chinese and full-width quotation marks
  // Both patterns are built from the hardcoded punctuationChars literal above, not user input. False positives — flagged only because the RegExp arguments are non-literal.
  // nosemgrep: eslint.detect-non-literal-regexp
  const splitRegex = new RegExp(`(\\s+|[${punctuationChars}])`);
  // nosemgrep: eslint.detect-non-literal-regexp
  const punctuationOnlyRegex = new RegExp(`^[${punctuationChars}]$`);

  const words = text.split(splitRegex).filter(Boolean);
  const isPunctuation = str => punctuationOnlyRegex.test(str);

  let currentText = '';
  let accumulatedHeight = currentHeight;
  const fragments = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const tempText = isPunctuation(word) ? `${currentText}${word}`.trim() : `${currentText} ${word}`.trim();

    tempContainer.textContent = tempText;
    const height = elementUtils.getHeight(tempContainer);

    if (accumulatedHeight + height > USABLE_HEIGHT) {
      if (currentText) {
        fragments.push(currentText);
      }
      currentText = word;
      tempContainer.textContent = currentText;
      accumulatedHeight = 0;
      continue;
    }
    currentText = tempText;
  }

  if (currentText) {
    fragments.push(currentText);
  }

  container.removeChild(tempContainer);

  // Replace the original element with new elements
  const newElements = [];
  const fragment = document.createDocumentFragment();

  fragments.forEach((textPart, i) => {
    if (i > 0) {
      const breakElement = createPageBreak();
      fragment.appendChild(breakElement);
    }

    const newEl = document.createElement(el.tagName);
    newEl.className = el.className;
    newEl.textContent = textPart;
    fragment.appendChild(newEl);
    newElements.push(newEl);
  });

  container.replaceChild(fragment, el);
  return newElements;
};

const wrapPagesWithHeaderFooter = (container) => {
  const fragments = [];
  let page = createPageWrapper();
  let contentEl = page.querySelector('.pdf-content');

  const children = Array.from(container.children);
  for (const child of children) {
    if (child.classList.contains('page-break')) {
      fragments.push(page);
      page = createPageWrapper();
      contentEl = page.querySelector('.pdf-content');
      continue;
    }
    contentEl.appendChild(child.cloneNode(true));
  }

  fragments.push(page);
  container.innerHTML = '';
  fragments.forEach(p => container.appendChild(p));
};

const processContentForPdf = (container) => {
  let currentHeight = 0;
  const groups = getHeadingGroups(container);

  for (const [index, group] of groups.entries()) {
    if (index === 0) {
      const firstElement = group[0];
      const firstElementMarginTop = elementUtils.getMarginTop(firstElement);
      currentHeight += firstElementMarginTop;
    }
    const groupHeight = getGroupHeight(group);
    if (currentHeight + groupHeight <= USABLE_HEIGHT) {
      // Put the entire group in the current page
      currentHeight += groupHeight;
      continue;
    }
    // Need to split the group across pages
    for (const el of group) {
      const elHeight = elementUtils.getHeight(el);
      const elMarginBottom = elementUtils.getMarginBottom(el);
      if (currentHeight + elHeight + elMarginBottom <= USABLE_HEIGHT) {
        // Put the element in the current page
        currentHeight += elHeight + elMarginBottom;
        continue;
      }
      // Need to split the element across pages
      if (el.tagName === 'TABLE') {
        const result = splitTableToFitPage(el, currentHeight);
        const hasLongContent = result && result.longContentElement;
        currentHeight = hasLongContent ? 0 : USABLE_HEIGHT;
        if (hasLongContent) {
          insertPageBreakBefore(el);
        }
        continue;
      }
      if (el.tagName === 'UL') {
        const result = splitUlToFitPage(el, currentHeight);
        const lastUl = result[result.length - 1];
        const lastUlHeight = elementUtils.getHeight(lastUl);
        const lastUlMarginBottom = elementUtils.getMarginBottom(lastUl);
        const hasLongContent = result && result.longContentElement;
        currentHeight = hasLongContent ? 0 : lastUlHeight + lastUlMarginBottom;
        if (hasLongContent) {
          insertPageBreakBefore(el);
        }
        continue;
      }
      if (['P', 'PRE'].includes(el.tagName)) {
        const isElementAbleToFit = currentHeight + elHeight <= USABLE_HEIGHT;

        if (!isElementAbleToFit) {
          const img = el.querySelector('img');
          if (img && currentHeight < USABLE_HEIGHT / 2) {
            const imgHeight = elementUtils.getHeight(img);
            const imgMarginBottom = elementUtils.getMarginBottom(img);
            img.style.height = `${USABLE_HEIGHT - currentHeight}px`;
            img.style.width = 'auto';
            currentHeight += imgHeight + imgMarginBottom;
            continue;
          }
          insertPageBreakBefore(el);
          if (elHeight > USABLE_HEIGHT) {
            splitElementTextToFitPage(el, currentHeight);
          }
          currentHeight = elHeight + elMarginBottom;
          continue;
        }
        currentHeight += elHeight + elMarginBottom;
      }

      insertPageBreakBefore(el);
      currentHeight = elHeight + elMarginBottom;
    }
  }

  wrapPagesWithHeaderFooter(container);
};

const download = async (e) => {
  state.isDownloading = true;
  const container = document.createElement('div');
  const html = markdownUtils.toHtml(props.text);
  container.classList.add('v-sheet', 'v-theme--light', 'markdown', 'pdf-container');
  container.innerHTML = html;
  document.body.appendChild(container);

  await convertImagesToBase64OrLink(container);
  fitImagesSize(container);

  processContentForPdf(container);

  // Since html2pdf .save() triggers DOM repainting,
  // we need to force toolbar-wrapper in hovered state to keep toolbar visible.
  const eventTarget = e.target;
  const toolbarWrapper = eventTarget.closest('.toolbar-wrapper');
  if (toolbarWrapper) {
    toolbarWrapper.classList.add('hovered');
  }

  await html2pdf()
    .from(container)
    .set({
      margin: 0,
      filename: `${props.fileName}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'px', format: [PAGE_WIDTH, PAGE_HEIGHT] },
      pagebreak: { mode: ['css'] },
    })
    .save();

  if (toolbarWrapper) {
    toolbarWrapper.classList.remove('hovered');
  }

  document.body.removeChild(container);
  // For better visual experience
  await delay(1000);
  state.isDownloading = false;
};
</script>

<template>
  <AppIconButton
    :tooltip="$t('__actionDownloadAsPdf')"
    :loading="state.isDownloading"
    aria-label="Download as PDF"
    icon="mdi-file-pdf-box"
    @click="(e) => download(e)"
  >
    <template #loader>
      <AppProgressCircular
        :size="14"
        :width="2"
      />
    </template>
  </AppIconButton>
</template>
