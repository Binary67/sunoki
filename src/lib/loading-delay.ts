const STIME = 0;

export async function waitForSkeletonLoadingDelay() {
  await new Promise((resolve) => setTimeout(resolve, STIME * 1000));
}
