import { useEffect, useRef } from "react";

function LoadMoreSentinel({ onVisible, disabled }) {
  const sentinelRef = useRef(null);
  const onVisibleRef = useRef(onVisible);

  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    if (disabled || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onVisibleRef.current();
    }, { rootMargin: "400px 0px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [disabled]);

  return <div ref={sentinelRef} aria-hidden="true" />;
}

export default LoadMoreSentinel;
