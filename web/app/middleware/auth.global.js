export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();

  if (to.meta.middleware?.some(m => ['guest', 'public'].includes(m))) {
    return;
  }

  if (!auth.isSignedIn.value) {
    return auth.abort({ redirect: from.path });
  }

  await auth.refresh();

  return;
});
