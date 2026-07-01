export async function waitForSkeletonLoadingDelay() {
  const delaySeconds = Number(process.env.STIME ?? 0);
  if (!(delaySeconds > 0)) return;

  await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
}
