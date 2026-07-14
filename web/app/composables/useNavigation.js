export const useNavigation = () => {
  const router = useRouter();

  const openInNewTab = (to, options = {}) => {
    const { open = {}, ...navigateOptions } = options;
    return navigateTo(router.resolve(to).href, {
      ...navigateOptions,
      open: {
        target: '_blank',
        noopener: true,
        noreferrer: true,
        ...open,
      },
    });
  };

  return {
    openInNewTab,
  };
};
