/**
 * @typedef {Object} DisplayField
 * @property {string} title
 * @property {string} value
 * @property {Object} appendComponent
 * @property {Object} appendComponentProps
 * @property {string | function} icon
 * @property {string | function} iconColor
 * @property {string | function} iconPath
 * @property {string | function} iconPathMaskColor
 * @property {boolean} isBlockText
 * @property {boolean} isChip
 * @property {boolean} isClickable
 * @property {boolean} isCopyable
 * @property {boolean} isCountdown
 * @property {boolean} isCurrency
 * @property {boolean} isFileSize
 * @property {boolean} isHidden
 * @property {boolean} isImage
 * @property {boolean} isInProgress
 * @property {boolean} isJavaScriptCode
 * @property {boolean} isJinjaCode
 * @property {boolean} isJsonCode
 * @property {boolean} isJsonToMarkdown
 * @property {boolean} isMarkdown
 * @property {boolean} isNumber
 * @property {boolean} isPythonCode
 * @property {boolean} isSecret
 * @property {boolean} isShellCode
 * @property {boolean} isSingleLine
 * @property {boolean} isStatus
 * @property {boolean} isTimeInterval
 * @property {boolean} isTimestamp
 * @property {boolean} forceText
 * @property {Object} chipOptions
 * @property {string} chipOptions.color
 * @property {Object} editorOptions
 * @property {boolean} editorOptions.disabled
 * @property {boolean} editorOptions.enableLineWrapping
 * @property {number} editorOptions.maxLines
 * @property {number} editorOptions.minLines
 * @property {Object} imageOptions
 * @property {number} imageOptions.size
 * @property {'avatar'} imageOptions.variant
 * @property {Object} link
 * @property {string} link.href
 * @property {string} link.target
 * @property {boolean} markdownViewerOptions.enableToc
 * @property {boolean} markdownViewerOptions.enableAnchors
 * @property {string} markdownViewerOptions.downloadFileName
 * @property {string} markdownViewerOptions.maxHeight
 * @property {string} markdownViewerOptions.width
 * @property {number} maxChars
 * @property {Object} numberOptions
 * @property {number} numberOptions.decimalPlaces
 * @property {string} numberOptions.prefix
 * @property {string} numberOptions.suffix
 * @property {Object} table
 * @property {function} table.expandedRow
 * @property {DisplayField[]} table.headers
 * @property {string} table.headers.key
 * @property {function} table.isExpandedRowVisible
 * @property {Object} timestampOptions
 * @property {boolean} timestampOptions.isRelative
 */
