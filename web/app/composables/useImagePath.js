export default function useImagePath() {
  const { baseURL } = useRuntimeConfig().app;

  const resolvePath = path => `${baseURL.replace(/\/$/, '')}${path}`;

  return {
    resolvePath,
  };
}
