export function useDeploymentConfig() {
  const config = useRuntimeConfig().public;

  const logo = Object.freeze({
    light: config.appLogoLightUrl || null,
    dark: config.appLogoDarkUrl || null,
  });

  const managementConsoleGroups = Object.freeze(
    (config.appManagementConsoleGroups || '')
      .split(',')
      .map(group => group.trim())
      .filter(Boolean),
  );

  const hasManagementConsoleGroups = managementConsoleGroups.length > 0;

  return {
    hasManagementConsoleGroups,
    logo,
    managementConsoleGroups,
  };
}
