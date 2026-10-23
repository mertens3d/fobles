// @source-path [fobles] src/content/sitecore-worker/pool/worker-readiness.ts

const readyResolversByTabId =
  new Map<number, Array<() => void>>();

const readyWorkerTabIds =
  new Set<number>();

export function waitForWorkerReady(
  tabId: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      let timeout:
        | ReturnType<typeof setTimeout>
        | undefined = undefined;

      const removeResolver =
        (): void => {
          const resolvers =
            readyResolversByTabId.get(
              tabId,
            );

          if (resolvers) {
            const remainingResolvers =
              resolvers.filter(
                (resolver) =>
                  resolver !== onReady,
              );

            if (
              remainingResolvers.length >
              0
            ) {
              readyResolversByTabId.set(
                tabId,
                remainingResolvers,
              );
            } else {
              readyResolversByTabId.delete(
                tabId,
              );
            }
          }
        };

      const onReady =
        (): void => {
          if (timeout) {
            clearTimeout(timeout);
          }

          removeResolver();
          readyWorkerTabIds.delete(tabId);
          resolve();
        };

      if (readyWorkerTabIds.has(tabId)) {
        onReady();
      } else {
        const resolvers =
          readyResolversByTabId.get(
            tabId,
          ) ?? [];

        resolvers.push(onReady);

        readyResolversByTabId.set(
          tabId,
          resolvers,
        );

        timeout = setTimeout(
          () => {
            removeResolver();
            readyWorkerTabIds.delete(
              tabId,
            );

            reject(
              new Error(
                `Worker tab ${tabId} did not become ready in time`,
              ),
            );
          },
          timeoutMs,
        );
      }
    },
  );
}

export function markWorkerReady(
  tabId: number | undefined,
): void {
  if (tabId !== undefined) {
    const resolvers =
      readyResolversByTabId.get(
        tabId,
      );

    if (
      resolvers &&
      resolvers.length > 0
    ) {
      readyResolversByTabId.delete(
        tabId,
      );

      resolvers.forEach(
        (resolve) => {
          resolve();
        },
      );
    } else {
      readyWorkerTabIds.add(tabId);
    }
  }
}

export function resetWorkerReadiness(
  tabId: number,
): void {
  readyResolversByTabId.delete(tabId);
  readyWorkerTabIds.delete(tabId);
}

export function clearWorkerReadiness():
  void {
  readyResolversByTabId.clear();
  readyWorkerTabIds.clear();
}