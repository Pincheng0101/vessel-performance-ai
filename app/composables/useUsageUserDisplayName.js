import { UsageConstant } from '~/constants';

const ADMIN_GET_USERS_BATCH_LIMIT = 50;

const shouldReplaceUserDisplayName = (userId) => {
  const value = String(userId ?? '');
  return UsageConstant.UserDisplayNameReplacementPrefixes.some(prefix => value.startsWith(prefix));
};

const buildUserDisplayNameMap = ({
  notFoundUserNames = [],
  users = [],
} = {}) => {
  const displayNameById = {};

  users.forEach((user) => {
    if (!user.userName) return;
    displayNameById[user.userName] = user.email || user.userName;
  });

  notFoundUserNames.forEach((userId) => {
    displayNameById[userId] = userId;
  });

  return displayNameById;
};

const chunkUserIds = (userIds) => {
  const chunks = [];

  for (let index = 0; index < userIds.length; index += ADMIN_GET_USERS_BATCH_LIMIT) {
    chunks.push(userIds.slice(index, index + ADMIN_GET_USERS_BATCH_LIMIT));
  }

  return chunks;
};

export default function useUsageUserDisplayName() {
  const server = useServer();
  const userDisplayNameById = useState('usage-user-display-name-by-id', () => ({}));

  const getUserDisplayName = userId => userDisplayNameById.value[userId] || userId;

  const shouldLoadUserDisplayName = (userId) => {
    const cachedDisplayName = userDisplayNameById.value[userId];
    return shouldReplaceUserDisplayName(userId) && (!cachedDisplayName || cachedDisplayName === userId);
  };

  const getUnresolvedUserIds = (userIds = []) => arrUtils.deduplicate(userIds).filter(shouldLoadUserDisplayName);

  const setUserDisplayNames = (displayNameById = {}) => {
    userDisplayNameById.value = {
      ...userDisplayNameById.value,
      ...displayNameById,
    };
  };

  const loadUserDisplayNames = async (userIds = []) => {
    const unresolvedUserIds = getUnresolvedUserIds(userIds);
    if (!unresolvedUserIds.length) return;

    await Promise.all(chunkUserIds(unresolvedUserIds).map(async (batchUserIds) => {
      const { data, error } = await server.user.adminGetUsers({
        userNames: batchUserIds,
      }, {
        lazy: false,
      });

      if (error.value) return;

      setUserDisplayNames(buildUserDisplayNameMap({
        notFoundUserNames: data.value?.notFoundUserNames,
        users: data.value?.data,
      }));
    }));
  };

  return {
    getUserDisplayName,
    loadUserDisplayNames,
  };
}
