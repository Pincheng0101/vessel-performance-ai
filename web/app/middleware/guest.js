import { ResourceConstant } from '~/constants';

export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore();
  const router = useRouter();

  if (!authStore.accessToken) return;

  if (!authStore.canAccessManagementConsole) {
    return router.push('/user');
  }

  return router.push(resourceUtils.getUrl(ResourceConstant.Type.AGENT.value));
});
