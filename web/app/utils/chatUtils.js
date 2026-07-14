import { ChatConstant } from '~/constants';
import { ContentBlockResponseFactory } from '~/models/server/contentBlock';
import { AssistantChatRoomMessage, UserChatRoomMessage } from '~/models/ui/chatRoom';

class chatUtils {
  static CITATION_REGEX = /\[((?:Ref\s+)?(\d+))\]/gi;

  /**
   * Extracts all reference indices found in citation patterns (e.g. [Ref 1], [2]) from a string.
   *
   * Only strict citation forms are recognised: bare numeric brackets like `[1]` or `Ref`-labelled
   * brackets like `[Ref 1]`. Brackets that contain other content (e.g. `[1, 2]`, `[hello 1]`) are
   * intentionally ignored to avoid misinterpreting plain text as citations.
   *
   * @param {string} text - The text to extract indices from.
   * @returns {Set<number>} A set of referenced numeric indices.
   */
  static extractReferencedIndices(text) {
    const indices = new Set();
    const value = text ?? '';
    chatUtils.CITATION_REGEX.lastIndex = 0;
    let match;
    while ((match = chatUtils.CITATION_REGEX.exec(value)) !== null) {
      indices.add(Number(match[2]));
    }
    return indices;
  }

  /**
   * Converts citation patterns in text (e.g. [Ref 1], [2]) into clickable anchor links.
   *
   * Uses the same strict matching as {@link chatUtils.extractReferencedIndices}, so plain bracketed
   * content such as `[1, 2]` is left untouched.
   *
   * @param {string} text - The text to process.
   * @returns {string} HTML string with citation patterns replaced by anchor elements.
   */
  static toReferenceLinks(text) {
    const value = text ?? '';
    return value.replace(chatUtils.CITATION_REGEX, (match, label, number) => {
      return `<a href="#" class="font-weight-medium" data-index="${number}"> [${label}]</a>`;
    });
  }

  /**
   * Flattens paginated chat session groups (newest-first) into a chronological
   * list of completed user/assistant chat-room messages for transcript display.
   *
   * @param {object[]} groups - Session message groups as returned by `chatSession.listMessages`.
   * @returns {import('~/models/ui/chatRoom').ChatRoomMessage[]} Ordered chat-room messages.
   */
  static convertGroupsToMessages(groups) {
    const messages = [];
    const reversedGroups = [...groups].reverse();
    for (const group of reversedGroups) {
      const { pairs, toolResults } = group;
      if (!pairs?.length) continue;
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const isLastPair = i === pairs.length - 1;
        const userContent = (pair.user?.content ?? []).map(ContentBlockResponseFactory.create);
        messages.push(new UserChatRoomMessage({
          content: userContent,
          status: ChatConstant.MessageStatus.COMPLETED,
        }));
        const assistantContent = (pair.assistant?.content ?? []).map(ContentBlockResponseFactory.create);
        if (isLastPair && toolResults && assistantContent.length > 0) {
          assistantContent.at(-1).toolResults = toolResults;
        }
        messages.push(new AssistantChatRoomMessage({
          content: assistantContent,
          status: ChatConstant.MessageStatus.COMPLETED,
        }));
      }
    }
    return messages;
  }
}

export default chatUtils;
