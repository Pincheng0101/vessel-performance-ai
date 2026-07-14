export default defineNuxtRouteMiddleware(() => {
  const { canAccessWorkflowTemplate } = useWorkflowTemplate();
  if (canAccessWorkflowTemplate.value) {
    return;
  }
  return navigateTo('/', { replace: true });
});
