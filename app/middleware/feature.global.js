export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth();
  const router = useRouter();
  const { initFeatures, disabledResourceTypes } = useFeature();

  if (!auth.isSignedIn.value) return;

  await initFeatures();

  for (const resourceType of disabledResourceTypes.value) {
    const resourcePath = `/resources/${resourceType.path}`;
    if (to.path.includes(resourcePath) && to.path !== resourcePath) {
      return router.push(resourcePath);
    }
  }

  return;
});
